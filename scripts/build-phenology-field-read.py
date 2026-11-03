#!/usr/bin/env python3
"""Evidence-first, reproducible Michigan phenology field read.

Reads the existing daily archive and USA-NPN signal bundle. No new provider,
credential, dependency, fabricated historical normal, or biological prediction.
The output is intentionally not a species-emergence probability.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("America/Detroit")
MAX_AGE_DAYS = 3
USA_NPN = "https://usanpn.org/data"


def date_of(value):
    try:
        return dt.date.fromisoformat(value) if isinstance(value, str) else None
    except ValueError:
        return None


def number(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        return None
    if not math.isfinite(value) or not low <= value <= high:
        return None
    return float(value)


def consecutive(rows, field, as_of, days, bounds):
    """Only compare complete consecutive dates from the same archived season."""
    start = as_of - dt.timedelta(days=days)
    by_day = {date_of(r.get("date")): r for r in rows if isinstance(r, dict)}
    dates = [start + dt.timedelta(days=i) for i in range(days + 1)]
    vals = []
    for day in dates:
        record = by_day.get(day)
        value = number(record.get(field), *bounds) if record else None
        if value is None:
            return None
        vals.append(value)
    return vals


def observation_list(signals, as_of):
    """NPN adapter covers Michigan statewide; never label as local confirmation."""
    reports = signals.get("observations") if isinstance(signals, dict) else []
    if not isinstance(reports, list):
        return []
    out, seen = [], set()
    for record in reports:
        if not isinstance(record, dict):
            continue
        day = date_of(record.get("date"))
        name = record.get("name")
        phase = record.get("phase")
        if not day or not name or not phase or not all(isinstance(x, str) for x in (name, phase)):
            continue
        if not (0 <= (as_of - day).days <= 8):
            continue
        name, phase = name.strip()[:90], phase.strip()[:110]
        if not name or not phase or (name.lower(), phase.lower()) in seen:
            continue
        seen.add((name.lower(), phase.lower()))
        out.append({"name": name, "phase": phase, "date": day.isoformat(),
                    "scope": "Michigan statewide", "source": "USA National Phenology Network",
                    "sourceUrl": USA_NPN, "evidence": "reported-observation"})
    return sorted(out, key=lambda r: r["date"], reverse=True)[:4]


def field_prompt(month):
    # Deliberately a field-check suggestion, never a claim of sighting or arrival.
    if month in (12, 1, 2):
        return "Check sheltered woods for evergreen shelter and open water for winter birds. Never infer safe ice from temperature history."
    if month in (3, 4):
        return "Look along wet woods for catkins, red-winged blackbirds and changing buds. Record the first date you actually see each."
    if month in (5, 6):
        return "Watch the progression from bud to flower to fruit. Compare exposed and sheltered sites, and note the date of each stage."
    if month in (7, 8):
        return "Listen for cicadas and katydids after dusk; note which flowers are producing nectar in different habitats."
    return "Compare leaf color and leaf drop among maples, oaks and sheltered woodlots. Look for migrating birds around marsh edges."


def build(rows, signals, today=None):
    today = today or dt.datetime.now(TZ).date()
    valid = [r for r in rows if isinstance(r, dict) and date_of(r.get("date"))]
    valid = [r for r in valid if date_of(r["date"]) <= today]
    valid.sort(key=lambda r: r["date"])
    if not valid:
        return {"schema": "phenology-field-read-v1", "status": "unavailable",
                "reason": "No dated field archive has been recorded.", "asOfDate": None,
                "observations": [], "tracks": [], "quality": []}
    latest = valid[-1]
    as_of = date_of(latest["date"])
    age = (today - as_of).days
    status = "current" if age <= MAX_AGE_DAYS else "archive-only"
    quality = []
    tracks = []
    week_heat = consecutive(valid, "gdd", as_of, 7, (0, 15000))
    # The source is a GRIDDDED temperature reconstruction. A declining
    # cumulative total is mathematically impossible absent input revision.
    if week_heat and any(b < a - 0.01 for a, b in zip(week_heat, week_heat[1:])):
        quality.append("Gridded accumulated heat declined in the seven-day archive. The input may have been revised; no week-on-week heat pace is reported.")
        week_heat = None
    heat = number(latest.get("gdd"), 0, 15000)
    if heat is not None:
        detail = (f"+{round(week_heat[-1] - week_heat[0])} base-50°F GDD in seven complete days."
                  if week_heat else "Seven-day heat change withheld: incomplete or revised daily record.")
        tracks.append({"id": "heat", "label": "Seasonal warmth", "value": str(round(heat)),
                       "unit": "GDD50 since Jan 1", "detail": detail,
                       "source": "Open-Meteo historical gridded air temperature, Grayling reference point",
                       "evidence": "modeled-climate", "sourceUrl": "https://open-meteo.com/en/docs/historical-weather-api",
                       "asOfDate": as_of.isoformat()})
    river_week = consecutive(valid, "ausableTempF", as_of, 7, (30, 100))
    river_now = number(latest.get("ausableTempF"), 30, 100)
    if river_now is not None:
        delta = river_week[-1] - river_week[0] if river_week else None
        movement = ("approximately steady over seven days" if abs(delta) < 2
                    else f"{abs(round(delta))}°F {'warmer' if delta > 0 else 'cooler'} than seven days earlier") if delta is not None else "Seven-day comparison unavailable"
        tracks.append({"id": "river", "label": "AuSable water", "value": str(round(river_now)),
                       "unit": "°F", "detail": movement + ". This is a river gauge, not Saginaw Bay.",
                       "source": "USGS water-temperature gauge, banked daily",
                       "evidence": "gauge-observation", "sourceUrl": "https://waterdata.usgs.gov/",
                       "asOfDate": as_of.isoformat()})
    observations = observation_list(signals, as_of) if status == "current" else []
    if not observations:
        quality.append("No sufficiently recent Michigan-wide Nature's Notebook reports are available in this snapshot.")
    if age > MAX_AGE_DAYS:
        quality.insert(0, f"Latest archived snapshot is {age} days old. This read is historical, not live.")
    quality.append("USA-NPN observations shown here are statewide, not confirmed sightings around Saginaw Bay.")
    quality.append("Only the available 2026 archive is evaluated; no multi-year climate normal or species onset date is inferred.")
    return {"schema": "phenology-field-read-v1", "status": status,
            "asOfDate": as_of.isoformat(), "generatedForDate": today.isoformat(),
            "region": "Saginaw Bay / AuSable reference area", "tracks": tracks,
            "observations": observations, "fieldPrompt": field_prompt(as_of.month),
            "quality": quality, "modelLimit": "Describes recorded conditions and observation reports; never confirms today's presence or predicts species emergence."}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--snapshots", type=Path, default=ROOT / "data/snapshots.json")
    p.add_argument("--signals", type=Path, default=ROOT / "data/signals.json")
    p.add_argument("--output", type=Path, default=ROOT / "data/phenology-field-read.json")
    p.add_argument("--today", type=dt.date.fromisoformat, default=None)
    args = p.parse_args()
    rows = json.loads(args.snapshots.read_text())
    signals = json.loads(args.signals.read_text())
    result = build(rows, signals, args.today)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Field read: {result['status']} {result['asOfDate']} ({len(result['tracks'])} tracks, {len(result['observations'])} statewide reports)")


if __name__ == "__main__":
    main()
