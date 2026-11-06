#!/usr/bin/env python3
"""Refresh official Michigan DNR area counts. No fabricated figures or anonymous reports.
Conservatively parses the published HTML tables, preserves past seasons, and stops on
source layout changes. No API key, server-side visitor fetch, Redis or database.
"""
import argparse
import datetime as dt
import html
from html.parser import HTMLParser
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEST = ROOT / "data/first-freeze-waterfowl.json"
TYPES = ("ducks", "geese", "swans")
DATE = re.compile(r"^\s*(\d{1,2})/(\d{1,2})/(20\d\d)\s*$")
SITES = ("nayanquing", "fish-point")
SPECIES = {"ducks": {"Mallard","Black duck","Wood duck","American wigeon","Gadwall","Northern shoveler",
                      "Northern pintail","Blue-winged teal","Green-winged teal","Canvasback","Redhead",
                      "Ring-necked duck","Bufflehead","Goldeneye","Scaup","Hooded merganser"},
           "swans":{"Mute swan","Tundra swan","Trumpeter swan","Unidentified swan"},
           "geese":{"Canada geese","Snow geese","White-fronted geese","Brant"}}

def normalize(s):
    return re.sub(r"\s+", " ", html.unescape(s).replace("\u00a0"," ")).strip(" :\n\r\t")

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tables=[];self.cur=None;self.row=None;self.cell=None;self.depth=0
    def handle_starttag(self,tag,attrs):
        if tag=="table":
            if self.cur is None:
                self.cur=[];self.depth=1
            else:self.depth+=1
        if self.cur is None:return
        if tag=="tr" and self.row is None:self.row=[]
        if tag in ("td","th") and self.row is not None:self.cell=[]
    def handle_data(self,text):
        if self.cell is not None:self.cell.append(text)
    def handle_endtag(self,tag):
        if tag in ("td","th") and self.cell is not None and self.row is not None:
            self.row.append(normalize("".join(self.cell)));self.cell=None
        if tag=="tr" and self.row is not None and self.cur is not None:
            if self.row:self.cur.append(self.row)
            self.row=None
        if tag=="table" and self.cur is not None:
            self.depth-=1
            if self.depth==0:self.tables.append(self.cur);self.cur=None

def clean_number(v):
    v=normalize(v).replace(",","")
    if not re.fullmatch(r"\d{1,8}",v):return None
    n=int(v)
    return n if n<=10000000 else None

def parse_count_html(source):
    p=Tables();p.feed(source)
    data={};species=[]
    for table in p.tables:
        heading=None;header=None
        for row in table:
            flattened=[normalize(x).lower() for x in row]
            if "week ending" in " ".join(flattened) or "week ending:" in " ".join(flattened):
                header=row;break
        if not header:continue
        for category in TYPES:
            ix=next((i for i,t in enumerate(header) if normalize(t).lower()==f"total {category}"),None)
            if ix is None:continue
            records=[]
            for row in table:
                if len(row)<=ix:continue
                m=DATE.match(normalize(row[0]))
                if not m:continue
                try:day=dt.date(int(m[3]),int(m[1]),int(m[2]))
                except ValueError:continue
                count=clean_number(row[ix])
                if count is None:continue
                records.append([day.isoformat(),count,row])
            if len(records)<1:continue
            records.sort(key=lambda x:x[0])
            if category not in data or records[-1][0]>data[category][-1][0]:
                data[category]=[(date,count) for date,count,_ in records]
            latest=records[-1]
            composition={}
            for j,name in enumerate(header):
                label=normalize(name)
                if label not in SPECIES[category] or j>=len(latest[2]):continue
                number=clean_number(latest[2][j])
                if number is not None and number>0:composition[label]=number
            if composition:
                species.append({"date":latest[0],"kind":category,"counts":composition})
    return data,species

def update_bank(bank,area_id,parsed,breakdown,today):
    area=bank["areas"][area_id]
    changes=0
    for category,rows in parsed.items():
        existing={day:count for day,count in area.get(category,[])}
        for day,value in rows:
            if day>today or day<"2026-09-01":continue
            if existing.get(day)!=value:
                existing[day]=value;changes+=1
        area[category]=[[day,existing[day]] for day in sorted(existing)][-180:]
    for sp in sorted(breakdown,key=lambda x:x["date"],reverse=True):
        if sp["date"]>today or sp["date"]<"2026-09-01":continue
        if sp["date"] not in {row[0] for row in area.get(sp["kind"],[])}:continue
        previous=area.get("species") or {}
        if sp["date"]>previous.get("date","") or (sp["date"]==previous.get("date") and len(sp["counts"])>len(previous.get("counts",{}))):
            area["species"]=sp;changes+=1
        break
    return changes

def fetch_site(url):
    if not url.startswith("https://www.michigan.gov/"):raise ValueError("Untrusted source host")
    request=urllib.request.Request(url,headers={"User-Agent":"MichiganPhenology/1.0 (public data; chrisizworski.com)","Accept":"text/html"})
    with urllib.request.urlopen(request,timeout=20) as response:
        body=response.read(3_000_000)
        if len(body)>=3_000_000:raise ValueError("Source body unexpectedly large")
        return body.decode("utf-8",errors="replace")

def self_test():
    mock="""<html><h2>Ducks</h2><table><thead><tr><th>Week Ending:</th><th>Total ducks:</th><th>Mallard:</th></tr></thead><tbody>
    <tr><td>09/27/2026</td><td>2,650</td><td>800</td></tr>
    <tr><td>11/01/2026</td><td>12,000</td><td>5,000</td></tr></tbody></table>
    <h2>Swans</h2><table><tr><th>Week ending:</th><th>Total swans:</th><th>Tundra swan:</th></tr>
    <tr><td>11/01/2026</td><td>504</td><td>450</td></tr></table></html>"""
    parsed,sp=parse_count_html(mock)
    assert parsed["ducks"][-1]==("2026-11-01",12000)
    assert parsed["swans"][-1]==("2026-11-01",504)
    assert {x["kind"] for x in sp}=={"ducks","swans"}
    parsed,sp=parse_count_html("<html><body>Access denied</body></html>")
    assert parsed=={} and sp==[]
    print("DNR weekly count parser: numeric/date validation, two layouts, and blocked-source handling passed")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--self-test",action="store_true")
    ap.add_argument("--dry-run",action="store_true")
    args=ap.parse_args()
    self_test()
    if args.self_test:return 0
    bank=json.loads(DEST.read_text())
    today=dt.datetime.now(dt.timezone.utc).date().isoformat()
    changes=0;success=0
    for site in SITES:
        url=bank["areas"][site]["source"]
        try:
            raw=fetch_site(url)
            data,species=parse_count_html(raw)
            if not data or "ducks" not in data:
                raise ValueError("DNR page did not contain a recognizable duck count table")
            success+=1
            delta=update_bank(bank,site,data,species,today)
            changes+=delta
            print(f"{site}: validated categories {sorted(data)}, {delta} changed rows/species; latest duck date {data['ducks'][-1][0]}")
        except Exception as exc:
            print(f"{site}: SOURCE UNAVAILABLE; preserving last verified bank ({type(exc).__name__}: {str(exc)[:130]})",file=sys.stderr)
    if success==0:
        print("No data sources readable. No bank overwritten; old surveys remain dated history.",file=sys.stderr)
        return 1
    if args.dry_run:
        print(f"DRY RUN: {changes} candidate changes, {success} sources validated")
    elif changes:
        DEST.write_text(json.dumps(bank,ensure_ascii=False,indent=2)+"\n")
        print(f"Wrote {changes} DNR survey updates to {DEST.relative_to(ROOT)}")
    else:print("No new official survey data")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
