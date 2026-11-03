#!/usr/bin/env python3
"""Evidence-scoped Python dispatch for the existing Michigan Phenology homepage.

This is a connector, not a new forecasting model: dates on specialist cards are
broad calendar watches. Recent reports come only from the dated USA-NPN bundle
and NEVER become locality-specific confirmations. The regional spring inset
copies independently tested historical species reporting windows without
transforming them into predicted first biological arrivals or flower openings.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("America/Detroit")
MAX_SIGNALS_AGE_DAYS = 3
MAX_OBSERVATION_AGE_DAYS = 8
SOURCE = "https://www.usanpn.org/data"


def date(s):
    if not isinstance(s, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return None
    try:
        return dt.date.fromisoformat(s)
    except ValueError:
        return None


def utc_timestamp(s):
    try:
        if not isinstance(s, str) or not s.endswith("Z"):
            return None
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(TZ).date()
    except ValueError:
        return None


def in_window(doy, start, end):
    return start <= doy <= end if start <= end else doy >= start or doy <= end


def wait_days(doy, start):
    return (start - doy) % 365


def valid_benchmark(entry, *, bird):
    if not isinstance(entry, dict):
        return None
    enough = entry.get("historicalWindowAvailable") is True if bird else entry.get("availableYears", 0) >= 4
    if not enough:
        return None
    interval = [entry.get(k) for k in ("typicalStart", "typicalCenter", "typicalEnd")]
    if not all(isinstance(v, str) and re.fullmatch(r"\d\d-\d\d", v) for v in interval):
        return None
    if not all(date("2027-" + value) for value in interval):
        return None
    return {
        "start": interval[0], "center": interval[1], "end": interval[2],
        "years": entry.get("availableYears"),
        "event": "first-public-spring-report" if bird else "regional-flowering-report-weeks",
        "scope": "historical-public-reporting",
        "modelStatus": entry.get("modelStatus"),
    }


def historical_regions(catalog, trials):
    if trials.get("schema") != "phenology-species-trials-v1":
        raise ValueError("Unverified species trial archive")
    species = {s["id"]: s for s in trials.get("species", []) if isinstance(s, dict) and isinstance(s.get("id"), str)}
    trillium = {r["id"]: r for r in species["trillium-grandiflorum"]["regions"]}
    humming = {r["id"]: r for r in species["ruby-throated-hummingbird"]["regions"]}
    out = []
    for region in catalog["regions"]:
        flower = trillium.get(region["trilliumRegion"])
        bird = humming.get(region.get("hummingbirdRegion")) if region.get("hummingbirdRegion") else None
        if flower is None:
            raise ValueError("Missing documented trillium region: " + region["id"])
        if region.get("hummingbirdRegion") and bird is None:
            raise ValueError("Missing documented hummingbird region: " + region["id"])
        out.append({
            "id": region["id"], "name": region["label"], "scopeNote": region["note"],
            "trillium": valid_benchmark(flower, bird=False),
            "hummingbird": valid_benchmark(bird, bird=True) if bird else None,
            "trilliumSampleRegion": flower["name"],
            "birdSampleRegion": bird["name"] if bird else None,
        })
    return out


def observed_reports(signals, today):
    as_of = utc_timestamp(signals.get("generatedAt"))
    if as_of is None or not 0 <= (today - as_of).days <= MAX_SIGNALS_AGE_DAYS:
        return [], "archive-only", as_of.isoformat() if as_of else None
    out = []
    seen = set()
    for item in signals.get("observations", []):
        if not isinstance(item, dict):
            continue
        observed = date(item.get("date"))
        name, phase = item.get("name"), item.get("phase")
        kingdom = item.get("kingdom")
        if (observed is None or not 0 <= (today - observed).days <= MAX_OBSERVATION_AGE_DAYS
                or not isinstance(name, str) or not isinstance(phase, str)
                or not 2 <= len(name.strip()) <= 85 or not 2 <= len(phase.strip()) <= 100
                or kingdom not in {"Animalia", "Plantae"}):
            continue
        key = (name.lower().strip(), phase.lower().strip(), observed)
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "name": name.strip(), "phase": phase.strip(), "date": observed.isoformat(),
            "category": "plants" if kingdom == "Plantae" else "wildlife",
            "evidence": "statewide-reported-phenophase",
            "source": "USA-NPN Nature's Notebook", "sourceUrl": SOURCE,
            "geography": "Across Michigan, not independently verified at Saginaw Bay",
        })
    out.sort(key=lambda r: (r["date"], r["name"]), reverse=True)
    return out[:6], "recent-statewide-reports" if out else "no-recent-eligible-reports", as_of.isoformat()


def build(catalog, signals, trials, today):
    if catalog.get("schema") != "natural-year-connections-v1":
        raise ValueError("Bad existing-tool connection registry")
    if len(catalog.get("regions", [])) != 7 or len(catalog.get("experiences", [])) < 8:
        raise ValueError("Incomplete region or specialist registry")
    ids, routes = set(), set()
    now_doy = (today - dt.date(today.year, 1, 1)).days + 1
    active, upcoming = [], []
    for t in catalog["experiences"]:
        sid, href = t.get("id"), t.get("url")
        start, end = t.get("startDoy"), t.get("endDoy")
        if (not isinstance(sid, str) or sid in ids or not isinstance(href, str)
                or (not href.startswith("/") and not href.startswith("#") and href != "https://michiganbirdingreport.com")
                or not all(type(v) is int and 1 <= v <= 365 for v in (start, end))
                or not isinstance(t.get("caution"), str) or not t["caution"]):
            raise ValueError("Bad calendar or route entry for " + str(sid))
        ids.add(sid)
        state = "usual-calendar-window" if in_window(now_doy, start, end) else "upcoming-calendar-window"
        wait = 0 if state == "usual-calendar-window" else wait_days(now_doy, start)
        entry = {
            "id": sid, "title": t["title"], "category": t["category"],
            "url": href, "linkLabel": t["linkLabel"], "scope": t["scope"],
            "what": t["what"], "caution": t["caution"],
            "source": t["source"], "state": state, "daysUntilStart": wait,
            "windowStartDoy": start, "windowEndDoy": end, "rank": t.get("rank", 0)
        }
        (active if state == "usual-calendar-window" else upcoming).append(entry)
    active.sort(key=lambda x: (-x["rank"], x["title"]))
    upcoming.sort(key=lambda x: (x["daysUntilStart"], -x["rank"]))
    reports, report_state, source_date = observed_reports(signals, today)
    return {
        "schema": "natural-year-dispatch-v1",
        "asOfDate": today.isoformat(), "signalsAsOfDate": source_date,
        "reportsState": report_state, "reports": reports,
        "active": active, "upcoming": upcoming[:6],
        "historicalRegions": historical_regions(catalog, trials),
        "science": {
            "reportSourceUrl": SOURCE,
            "reportsScope": "Michigan-wide reporting sample, not a local presence, abundance, or migration confirmation",
            "calendarScope": "Editorial watch windows link to specialist decision tools, not observed or guaranteed events",
            "historicalScope": "Regional flowering-report midpoints and first public hummingbird reports; not first local bloom or arrival",
            "yearRule": "The registry is an annual editorial calendar. Specialist tools own live and predictive decisions.",
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=ROOT / "data/natural-year-connections.json")
    parser.add_argument("--signals", type=Path, default=ROOT / "data/signals.json")
    parser.add_argument("--trials", type=Path, default=ROOT / "data/phenology-species-trials.json")
    parser.add_argument("--output", type=Path, default=ROOT / "data/natural-year-dispatch.json")
    parser.add_argument("--as-of", type=dt.date.fromisoformat)
    args = parser.parse_args()
    today = args.as_of or dt.datetime.now(TZ).date()
    result = build(json.loads(args.catalog.read_text()), json.loads(args.signals.read_text()),
                   json.loads(args.trials.read_text()), today)
    args.output.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n")
    print("Natural year", today, "|", len(result["active"]), "usual windows,",
          len(result["upcoming"]), "next watches,", len(result["reports"]), "statewide reports",
          "| source:", result["reportsState"])


if __name__ == "__main__":
    main()
