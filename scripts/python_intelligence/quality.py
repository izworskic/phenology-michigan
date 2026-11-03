"""Conservative data-quality analysis for dated environmental archives.

All calculations are descriptive, deterministic, and stdlib-only. Duplicate
calendar dates are *excluded* rather than arbitrarily picking a value.
A seasonal accumulated-heat reset is not treated as a data revision.
"""
from __future__ import annotations
import datetime as dt
import math


def iso_date(value):
    if not isinstance(value, str):
        return None
    try:
        day = dt.date.fromisoformat(value)
        return day if day.isoformat() == value else None
    except ValueError:
        return None


def numeric(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value) or value < low or value > high:
        return None
    return float(value)


def prepare_archive(rows, today):
    """Return unique, dated, nonfuture records and explicit rejection diagnostics.

    Never silently choose between duplicate daily snapshots; each conflicting
    date is excluded until an upstream operator reconciles the record.
    """
    if not isinstance(today, dt.date):
        raise TypeError("today must be a date")
    seen, duplicates = {}, set()
    future_records = invalid_records = 0
    for record in rows if isinstance(rows, list) else []:
        day = iso_date(record.get("date")) if isinstance(record, dict) else None
        if day is None:
            invalid_records += 1
            continue
        if day > today:
            future_records += 1
            continue
        if day in seen:
            duplicates.add(day)
        else:
            seen[day] = record
    for day in duplicates:
        seen.pop(day, None)
    return ([seen[d] for d in sorted(seen)], {
        "duplicateDates": [d.isoformat() for d in sorted(duplicates)],
        "futureRecordsExcluded": future_records,
        "invalidRecordsExcluded": invalid_records,
    })


def evidence_window(rows, as_of, days=28, audit=None):
    """Calendar-complete record coverage. Does not estimate missing days.

    Detects invalid decreasing cumulative base-50F GDD between successive
    dates in one calendar year; does not infer model error or source outage.
    """
    if days < 2 or days > 366:
        raise ValueError("days must be 2..366")
    if not isinstance(as_of, dt.date):
        raise TypeError("as_of must be a date")
    audit = audit or {}
    by_day = {iso_date(r.get("date")): r for r in rows if isinstance(r, dict)}
    start = as_of - dt.timedelta(days=days - 1)
    dates = [start + dt.timedelta(days=i) for i in range(days)]
    heat_days = river_days = recorded = 0
    missing = []
    revisions = []
    previous_heat = None
    previous_day = None
    for day in dates:
        record = by_day.get(day)
        if record is None:
            missing.append(day.isoformat())
        else:
            recorded += 1
        heat = numeric(record.get("gdd"), 0, 15000) if record else None
        river = numeric(record.get("ausableTempF"), 30, 100) if record else None
        if heat is not None:
            heat_days += 1
        if river is not None:
            river_days += 1
        if (heat is not None and previous_heat is not None
                and previous_day == day - dt.timedelta(days=1)
                and previous_day.year == day.year and heat < previous_heat - 0.01):
            revisions.append(day.isoformat())
        previous_day, previous_heat = day, heat
    return {
        "schema": "python-intelligence-evidence-v1",
        "windowStart": start.isoformat(), "windowEnd": as_of.isoformat(),
        "daysExpected": days, "recordedDays": recorded,
        "heatDays": heat_days, "riverDays": river_days,
        "missingDates": missing, "heatRevisionDates": revisions,
        "duplicateDates": list(audit.get("duplicateDates") or []),
        "futureRecordsExcluded": int(audit.get("futureRecordsExcluded") or 0),
        "invalidRecordsExcluded": int(audit.get("invalidRecordsExcluded") or 0),
        "scope": "archive-coverage-not-forecast-confidence",
    }
