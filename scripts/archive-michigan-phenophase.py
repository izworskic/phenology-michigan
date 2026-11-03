#!/usr/bin/env python3
"""Immutable daily *snapshots* of Michigan's 14-day phenophase reporting sample.

Never sum consecutive snapshots: their rolling 14-day windows overlap heavily.
Snapshots describe what the public map showed on each collection date, NOT
independent daily biological events, first bloom, abundance or a complete census.

Only already-public nine-region aggregates are archived. Individual coordinates,
reporter/site identifiers and raw source records never enter the archive.
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
ARCHIVE_SCHEMA = "michigan-phenophase-snapshot-archive-v1"
INDEX_SCHEMA = "michigan-phenophase-snapshot-index-v1"
SOURCE_SCHEMA = "michigan-phenophase-geography-v1"
SOURCE_NPN = "https://data.usanpn.org/observations/"
SOURCE_INAT = "https://www.inaturalist.org/observations?place_id=29"
SOURCE_LABELS = ("usa-npn", "inaturalist")
HEALTH = ("ok", "partial", "unavailable")
COVERAGE = ("multiple-reporters-or-sites", "limited-sample")
MAX_SNAPSHOTS_PER_YEAR = 366
MAX_ARCHIVE_BYTES = 16 * 1024 * 1024


def parse_day(raw):
    if not isinstance(raw, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        raise ValueError("A date must be a real ISO YYYY-MM-DD calendar date")
    return dt.date.fromisoformat(raw)


def bounded_count(value):
    if type(value) is not int or not 0 <= value <= 1_000_000:
        raise ValueError("Public aggregate count must be a nonnegative bounded integer")
    return value


def region_ids(config):
    if config.get("schema") != "michigan-observation-regions-v1":
        raise ValueError("Untrusted regional registry")
    regions = config.get("regions")
    if not isinstance(regions, list) or len(regions) != 9:
        raise ValueError("Expected nine fixed Michigan reporting regions")
    ids = [r["id"] for r in regions]
    if len(set(ids)) != 9:
        raise ValueError("Duplicate region IDs")
    return ids


def snapshot_from_geography(source, config, today):
    if not isinstance(source, dict) or source.get("schema") != SOURCE_SCHEMA:
        raise ValueError("No valid preaggregated geographic evidence")
    observed = parse_day(source.get("asOfDate"))
    if observed != today:
        raise ValueError("Refuse to archive stale or future evidence as today's snapshot")
    start = parse_day(source.get("windowStart"))
    end = parse_day(source.get("windowEnd"))
    if end != observed or (observed - start).days != 14:
        raise ValueError("Unexpected overlapping observation window")
    meta = source.get("science") or {}
    if (meta.get("noSubmissionRequired") is not True
            or meta.get("sourceNpn") != SOURCE_NPN
            or meta.get("sourceInaturalist") != SOURCE_INAT):
        raise ValueError("Untrusted scientific provenance or visitor-submission contract")
    health = source.get("sourceStatus") or {}
    if health.get("usaNpn") != "ok":
        raise ValueError("NPN collection is not verified complete; don't publish a new snapshot")
    if health.get("iNaturalist") not in HEALTH:
        raise ValueError("Unrecognized iNaturalist source health")
    capped = bounded_count(health.get("iNaturalistCappedQueries"))
    failed = bounded_count(health.get("iNaturalistFailedQueries"))
    if health["iNaturalist"] == "ok" and failed:
        raise ValueError("Source marked healthy despite failed queries")
    expected = region_ids(config)
    groups = config.get("phenophases", [])
    phases = {p["id"]: p for p in groups}
    if not isinstance(source.get("regions"), list) or len(source["regions"]) != 9:
        raise ValueError("Missing regional result")
    published = []
    for index, r in enumerate(source["regions"]):
        if not isinstance(r, dict) or r.get("id") != expected[index]:
            raise ValueError("Region identity mismatch")
        if (r.get("name") != config["regions"][index]["name"]
                or r.get("lat") != config["regions"][index]["lat"]
                or r.get("lon") != config["regions"][index]["lon"]):
            raise ValueError("Unexpected regional reference center or name")
        total = bounded_count(r.get("sampledReportCount"))
        if not isinstance(r.get("phases"), list) or len(r["phases"]) > 6:
            raise ValueError("Unbounded or missing phase list")
        phase_list = []
        seen = set()
        for p in r["phases"]:
            pid = p.get("id")
            if pid not in phases or pid in seen or p.get("coverage") not in COVERAGE:
                raise ValueError("Unrecognized phase or reporting coverage")
            seen.add(pid)
            if p.get("name") != phases[pid]["name"] or p.get("group") != phases[pid]["group"]:
                raise ValueError("Biological stage identity drift")
            latest = parse_day(p.get("latest"))
            if not start <= latest <= end:
                raise ValueError("A report date fell outside its captured window")
            reports = p.get("sourceReports") or {}
            if set(reports) != set(SOURCE_LABELS):
                raise ValueError("Unexpected report-source family")
            counts = {label: bounded_count(reports[label]) for label in SOURCE_LABELS}
            sites = bounded_count(p.get("reportingSites"))
            observers = bounded_count(p.get("reportingObservers"))
            days = bounded_count(p.get("uniqueReportingDays"))
            if (sites > counts["usa-npn"] or observers > counts["inaturalist"]
                    or days > 15 or not sum(counts.values())):
                raise ValueError("Incoherent phase reporting breadth")
            examples = []
            listed = p.get("species")
            if not isinstance(listed, list) or len(listed) > 4:
                raise ValueError("Unbounded species-example list")
            for x in listed:
                name, src = x.get("name"), x.get("source")
                if not isinstance(name, str) or not 2 <= len(name) <= 80 or any(c in name for c in "<>"):
                    raise ValueError("Untrusted public taxon label")
                if src not in SOURCE_LABELS or not start <= parse_day(x.get("date")) <= latest:
                    raise ValueError("Untrusted public taxon example")
                examples.append({"name": name, "date": x["date"], "source": src})
            phase_list.append({
                "id": pid, "latest": p["latest"], "coverage": p["coverage"],
                "reports": counts, "reportingSites": sites,
                "reportingObservers": observers, "uniqueReportingDays": days,
                "species": examples,
            })
        if sum(sum(p["reports"].values()) for p in phase_list) > total:
            raise ValueError("Displayed phase reports exceed total sampled reports")
        unavailable = r.get("unavailableInatPhases", [])
        if (not isinstance(unavailable, list)
                or any(p not in phases for p in unavailable)
                or len(set(unavailable)) != len(unavailable)):
            raise ValueError("Invalid partial-source evidence")
        published.append({"id": r["id"], "sampledReports": total,
                          "unavailableInatPhases": unavailable, "phases": phase_list})
    return {
        "asOfDate": observed.isoformat(),
        "windowStart": start.isoformat(), "windowEnd": end.isoformat(),
        "kind": "overlapping-14-day-reporting-snapshot",
        "sourceStatus": {
            "usaNpn": health["usaNpn"], "iNaturalist": health["iNaturalist"],
            "iNaturalistCappedQueries": capped, "iNaturalistFailedQueries": failed,
        },
        "regions": published,
    }


def validate_archive(archive, year, config):
    if not isinstance(archive, dict) or archive.get("schema") != ARCHIVE_SCHEMA or archive.get("year") != year:
        raise ValueError("Historical year schema mismatch")
    rows = archive.get("snapshots")
    if not isinstance(rows, list) or len(rows) > MAX_SNAPSHOTS_PER_YEAR:
        raise ValueError("Unexpected snapshot count for one calendar year")
    ids = region_ids(config)
    previous = None
    for snap in rows:
        as_of = parse_day(snap.get("asOfDate"))
        if as_of.year != year or (previous is not None and as_of <= previous):
            raise ValueError("Out-of-order, duplicated, or wrong-year history")
        if snap.get("kind") != "overlapping-14-day-reporting-snapshot":
            raise ValueError("History must never masquerade as daily event totals")
        if parse_day(snap.get("windowEnd")) != as_of or (as_of - parse_day(snap.get("windowStart"))).days != 14:
            raise ValueError("Unexpected historical window")
        regs = snap.get("regions")
        if not isinstance(regs, list) or [r.get("id") for r in regs] != ids:
            raise ValueError("Historical geography changed unexpectedly")
        if snap.get("sourceStatus", {}).get("usaNpn") != "ok":
            raise ValueError("Recorded incomplete NPN evidence as verified")
        for r in regs:
            bounded_count(r.get("sampledReports"))
            if not isinstance(r.get("phases"), list) or len(r["phases"]) > 6:
                raise ValueError("Unbounded historic phase data")
            for p in r["phases"]:
                if p.get("id") not in {a["id"] for a in config["phenophases"]}:
                    raise ValueError("Unknown archived phase")
                if p.get("coverage") not in COVERAGE:
                    raise ValueError("Unknown coverage state")
        previous = as_of
    return archive


def add_snapshot(archive, snapshot, config):
    day = parse_day(snapshot["asOfDate"])
    year = day.year
    if archive is None:
        archive = {"schema": ARCHIVE_SCHEMA, "year": year, "snapshots": []}
    validate_archive(archive, year, config)
    existing = next((x for x in archive["snapshots"] if x["asOfDate"] == snapshot["asOfDate"]), None)
    if existing is not None:
        # Original dated evidence is immutable, including on a repeated
        # workflow dispatch. A correction needs an independently reviewed PR.
        return archive, "already-archived-immutable"
    rows = archive["snapshots"] + [snapshot]
    rows.sort(key=lambda r: r["asOfDate"])
    result = {"schema": ARCHIVE_SCHEMA, "year": year, "snapshots": rows}
    validate_archive(result, year, config)
    return result, "captured"


def index_from_archives(archives):
    years = []
    for archive in sorted(archives, key=lambda x: x["year"]):
        snaps = archive["snapshots"]
        if not snaps:
            continue
        first = parse_day(snaps[0]["asOfDate"])
        last = parse_day(snaps[-1]["asOfDate"])
        actual = len(snaps)
        missing = (last - first).days + 1 - actual
        years.append({
            "year": archive["year"],
            "file": f"/data/michigan-phenophase-archive/{archive['year']}.json",
            "firstSnapshot": first.isoformat(),
            "lastSnapshot": last.isoformat(),
            "snapshotDays": actual,
            "missingCollectionDaysBetweenSnapshots": missing,
            "latestSourceStatus": snaps[-1]["sourceStatus"],
        })
    return {
        "schema": INDEX_SCHEMA,
        "years": years,
        "snapshotCount": sum(x["snapshotDays"] for x in years),
        "interpretation": {
            "oneSnapshotPerCollectionDay": True,
            "windowDays": 15,
            "rule": "Snapshots each contain an overlapping current-date-minus-14 through current-date reporting sample. NEVER add consecutive snapshot counts together.",
            "gap": "No snapshot for a date means the collection history is missing, not that no biological activity was observed.",
            "privacy": "Only broad regional samples, reporting-unit counts, and public species names are stored; no personal or site coordinates.",
            "sourcePolicy": "USA-NPN and iNaturalist sampled reports only. Source outages and capped queries are represented explicitly.",
            "start": "Archival collection begins from the first actual dated snapshot; historical raw observations are not reconstructed from rolling totals.",
            "visitorSubmissionsRequired": False,
        },
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source", type=Path, default=ROOT / "data/michigan-phenophase-geography.json")
    p.add_argument("--config", type=Path, default=ROOT / "data/michigan-observation-regions.json")
    p.add_argument("--directory", type=Path, default=ROOT / "data/michigan-phenophase-archive")
    p.add_argument("--index", type=Path, default=ROOT / "data/michigan-phenophase-archive-index.json")
    p.add_argument("--today", type=dt.date.fromisoformat, default=None,
                   help="Used for deterministic offline regression testing")
    a = p.parse_args()
    today = a.today or dt.datetime.now(TZ).date()
    config = json.loads(a.config.read_text())
    source = json.loads(a.source.read_text())
    snapshot = snapshot_from_geography(source, config, today)
    a.directory.mkdir(parents=True, exist_ok=True)
    archives = []
    current_path = a.directory / (str(today.year) + ".json")
    existing_files = sorted(a.directory.glob("[0-9][0-9][0-9][0-9].json"))
    for path in existing_files:
        if path.stat().st_size > MAX_ARCHIVE_BYTES:
            raise ValueError("Oversized historical artifact; split or investigate before updating")
        year = int(path.stem)
        archive = validate_archive(json.loads(path.read_text()), year, config)
        if path != current_path:
            archives.append(archive)
        else:
            current = archive
    if not current_path.exists():
        current = None
    result, status = add_snapshot(current, snapshot, config)
    if current != result or not current_path.exists():
        current_path.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n")
    archives.append(result)
    index = index_from_archives(archives)
    a.index.write_text(json.dumps(index, separators=(",", ":"), ensure_ascii=False) + "\n")
    print("Michigan phenophase observation archive:", status, today,
          "|", index["snapshotCount"], "immutable captures,",
          len(index["years"]), "year file(s),",
          "archive gaps:", sum(x["missingCollectionDaysBetweenSnapshots"] for x in index["years"]))


if __name__ == "__main__":
    main()
