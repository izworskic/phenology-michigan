#!/usr/bin/env python3
"""Species-specific Michigan phenology evidence and rolling-origin model audit.

Historical reports are NOT first flowers, first biological arrivals, a census,
or park-specific confirmations. All models are evaluated on prior-year-only
training data. This job does not issue real-time bloom/arrival forecasts.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRILLIUM = {
    "southwest": ("Southwest Michigan", 42.16, -86.20),
    "southeast": ("Southeast Michigan", 42.68, -83.62),
    "west": ("West Michigan", 43.26, -86.09),
    "central": ("Central Michigan", 43.45, -84.40),
    "north": ("Northern Lower Peninsula", 45.14, -85.33),
    "eastup": ("Eastern Upper Peninsula", 46.10, -84.45),
    "westup": ("Western Upper Peninsula", 46.65, -87.53),
}
HUMMINGBIRD = {
    "detroit": "Detroit & Ann Arbor",
    "kalamazoo": "Kalamazoo & Southwest",
    "grand-rapids": "Grand Rapids & West Michigan",
    "lansing": "Lansing & Mid-Michigan",
    "saginaw-bay": "Saginaw Bay & Bay City",
    "traverse-city": "Traverse City",
    "gaylord": "Gaylord & Northern Lower",
    "marquette": "Marquette & Central U.P.",
    "houghton": "Keweenaw & Western U.P.",
}
DAY_ZERO = dt.date(2027, 1, 1)
BASE_F = 40.0
MIN_REPORTS = 6
MIN_WEEKS = 2
MIN_TRAIN = 5
MIN_HOLDOUT = 3
MAX_HEAT_MAE = 9.0
MIN_IMPROVEMENT = 0.15
SOURCE_TRILLIUM = "https://www.inaturalist.org/observations?place_id=29&taxon_name=Trillium%20grandiflorum&term_id=12&term_value_id=13"
SOURCE_BIRD = "https://www.inaturalist.org/observations?place_id=29&taxon_id=6432"


def median(values):
    a = sorted(values)
    if not a:
        return None
    mid = len(a) // 2
    return a[mid] if len(a) % 2 else (a[mid - 1] + a[mid]) / 2


def percentile(values, fraction):
    a = sorted(values)
    return a[math.floor((len(a) - 1) * fraction)] if a else None


def doy(iso):
    try:
        value = dt.date.fromisoformat(iso)
        # Do not silently convert February 29 into March 1 on a non-leap year.
        day = dt.date(2027, value.month, value.day)
        return (day - DAY_ZERO).days + 1
    except (TypeError, ValueError):
        return None


def iso_day(day):
    if day is None:
        return None
    day = round(day)
    return (DAY_ZERO + dt.timedelta(days=day - 1)).isoformat()[5:]


def round1(value):
    return round(value + 1e-9, 1) if value is not None else None


def read_thermal(year_temps):
    if not isinstance(year_temps, list) or len(year_temps) != 122:
        return None
    total, out = 0.0, []
    for value in year_temps:
        if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not -40 < value < 120:
            return None
        total += max(0.0, value - BASE_F)
        out.append(total)
    return out


def crossing(series, threshold):
    for i, heat in enumerate(series):
        if heat >= threshold:
            return 60 + i
    return None


def annual_flowering(weekly, year_temps):
    grouped, seen = defaultdict(list), set()
    for row in weekly:
        if not isinstance(row, list) or len(row) != 2:
            continue
        date, count = row
        day = doy(date)
        if (not isinstance(date, str) or day is None or not isinstance(count, int)
                or isinstance(count, bool) or count <= 0 or not 74 <= day <= 195 or date in seen):
            continue
        seen.add(date)
        grouped[int(date[:4])].append((day, count))
    annual = []
    for year, values in sorted(grouped.items()):
        values.sort()
        count = sum(n for _, n in values)
        if count < MIN_REPORTS or len(values) < MIN_WEEKS:
            continue
        def report_at(p):
            k = max(1, math.ceil(count * p))
            running = 0
            for day, n in values:
                running += n
                if running >= k:
                    return day
            return values[-1][0]
        center = report_at(0.5)
        heat = read_thermal(year_temps.get(str(year)))
        if heat is None or not 60 <= center <= 181:
            continue
        annual.append({"year": year, "reports": count, "weeks": len(values),
                       "center": center, "low": report_at(0.2), "high": report_at(0.8),
                       "heatAtCenter": heat[center - 60], "_series": heat})
    return annual


def model_fold(sample, training):
    threshold = median([t["heatAtCenter"] for t in training])
    cal = median([t["center"] for t in training])
    pred = crossing(sample["_series"], threshold)
    # An unreachable threshold is an explicit failed forecast, not omitted success.
    return {"year": sample["year"], "reports": sample["reports"],
            "observedCenter": iso_day(sample["center"]),
            "heatDate": iso_day(pred), "calendarDate": iso_day(cal),
            "heatErrorDays": abs(pred - sample["center"]) if pred is not None else None,
            "calendarErrorDays": abs(cal - sample["center"])}


def mae(folds, key):
    # Unreachable dates count as model failure, with a conservative penalty.
    return sum(30 if fold[key] is None else fold[key] for fold in folds) / len(folds) if folds else None


def evaluate_flowering(region_id, meta, archive, thermal):
    entry = archive["regions"].get(region_id, {})
    temp = thermal["regions"].get(region_id, {})
    years = annual_flowering(entry.get("weekly", []), temp.get("years", {}))
    folds = []
    for sample in years:
        if sample["year"] < 2024:
            continue
        training = [row for row in years if row["year"] < sample["year"]]
        if len(training) >= MIN_TRAIN:
            folds.append(model_fold(sample, training))
    loo = []
    if len(years) >= MIN_TRAIN:
        for sample in years:
            other = [row for row in years if row["year"] != sample["year"]]
            if len(other) >= MIN_TRAIN - 1:
                loo.append(model_fold(sample, other))
    rh, rc = mae(folds, "heatErrorDays"), mae(folds, "calendarErrorDays")
    lh, lc = mae(loo, "heatErrorDays"), mae(loo, "calendarErrorDays")
    ready = (
        len(years) >= 7 and len(folds) >= MIN_HOLDOUT
        and all(row["heatErrorDays"] is not None for row in folds + loo)
        and rh is not None and lh is not None
        and rh <= MAX_HEAT_MAE and lh <= MAX_HEAT_MAE
        and rh <= rc * (1 - MIN_IMPROVEMENT)
        and lh <= lc * 0.9
        and max(row["heatErrorDays"] for row in folds) <= 14
    )
    # Fitted heat index is an empirical reporting-center marker, not a biological
    # thermal requirement; only supply when both evaluation gates pass.
    threshold = round(median([row["heatAtCenter"] for row in years])) if ready else None
    return {
        "id": region_id, "name": meta[0], "latitude": meta[1], "longitude": meta[2],
        "availableYears": len(years), "heldOutYears": len(folds),
        "typicalCenter": iso_day(median([row["center"] for row in years])),
        "typicalStart": iso_day(median([row["low"] for row in years])),
        "typicalEnd": iso_day(median([row["high"] for row in years])),
        "modelStatus": "historical-skill" if ready else "heat-date-withheld",
        "thermalReferenceGdd40": threshold,
        "metrics": {
            "rollingHeatMaeDays": round1(rh),
            "rollingCalendarMaeDays": round1(rc),
            "leaveYearOutHeatMaeDays": round1(lh),
            "leaveYearOutCalendarMaeDays": round1(lc),
        },
        "heldOut": folds,
        "annual": [{"year": r["year"], "reports": r["reports"], "center": iso_day(r["center"]),
                    "low": iso_day(r["low"]), "high": iso_day(r["high"])} for r in years],
        "evidence": "weekly-annotated-flowering-report",
        "caveat": "Regional weekly reporting midpoint, not actual first bloom, botanical peak, or bloom at an individual site.",
    }


def evaluate_bird(region_id, name, archive):
    years = []
    for season in archive.get("years", []):
        year = season.get("year")
        if not isinstance(year, int):
            continue
        rows = [r for r in season.get("observations", []) if isinstance(r, list) and len(r) >= 4
                and r[1] == region_id and isinstance(r[0], str) and r[0].startswith(str(year) + "-")]
        # Each reporter counts once; two distinct reporters minimum is an
        # observation-coverage threshold, not evidence of biological arrival.
        reporters = {str(r[2]) for r in rows if r[2] is not None}
        dates = [doy(r[0]) for r in rows]
        dates = [d for d in dates if d is not None and 90 <= d <= 166]
        if len(dates) < 2 or len(reporters) < 2:
            continue
        years.append({"year": year, "reports": len(rows),
                      "reporters": len(reporters), "center": min(dates)})
    years.sort(key=lambda r: r["year"])
    all_reports = sum(r["reports"] for r in years)
    supported = len(years) >= 6 and all_reports >= 30
    folds = []
    for sample in years:
        if sample["year"] < 2024:
            continue
        training = [row for row in years if row["year"] < sample["year"]]
        if len(training) < 4:
            continue
        cal = median([row["center"] for row in training])
        folds.append({"year": sample["year"], "reports": sample["reports"],
                      "observedFirstReport": iso_day(sample["center"]),
                      "historicalCalendar": iso_day(cal),
                      "absoluteErrorDays": round1(abs(cal - sample["center"]))})
    return {
        "id": region_id, "name": name,
        "availableYears": len(years), "heldOutYears": len(folds),
        "historicalWindowAvailable": supported,
        "typicalStart": iso_day(percentile([r["center"] for r in years], 0.2)) if supported else None,
        "typicalCenter": iso_day(median([r["center"] for r in years])) if supported else None,
        "typicalEnd": iso_day(percentile([r["center"] for r in years], 0.8)) if supported else None,
        "calendarMaeDays": round1(sum(f["absoluteErrorDays"] for f in folds) / len(folds)) if folds else None,
        "modelStatus": "reporting-history" if supported else "insufficient-reporting",
        "heldOut": folds,
        "annual": [{"year": r["year"], "reports": r["reports"],
                    "reporters": r["reporters"], "center": iso_day(r["center"])} for r in years],
        "evidence": "research-grade-first-public-report",
        "caveat": "Date of the first public report in an eligible year, not the first actual bird or a migration probability. Regional observation effort differs by year.",
    }


def build(flowering, thermal, bird_archive, today=None):
    now = today or dt.datetime.now(dt.timezone.utc).date()
    if (flowering.get("species") != "Trillium grandiflorum"
            or thermal.get("model") != "era5"
            or thermal.get("baseHeatF") != 40
            or bird_archive.get("provenance", {}).get("taxonId") != 6432):
        raise ValueError("Incompatible or missing biological / regional weather source archive")
    for region, meta in TRILLIUM.items():
        point = thermal.get("regions", {}).get(region, {}).get("coordinate")
        if not isinstance(point, list) or len(point) != 2 or any(abs(float(a)-b) > 0.0001 for a, b in zip(point, meta[1:])):
            raise ValueError("Region location mismatch in ERA5 archive: " + region)
    bloom = [evaluate_flowering(id, meta, flowering, thermal) for id, meta in TRILLIUM.items()]
    birds = [evaluate_bird(id, name, bird_archive) for id, name in HUMMINGBIRD.items()]
    return {
        "schema": "phenology-species-trials-v1",
        "generatedForDate": now.isoformat(), "sourceRetrieved": {
            "trillium": flowering.get("retrievedAt"), "temperature": thermal.get("retrievedAt"),
            "hummingbird": bird_archive.get("provenance", {}).get("extractedOn")},
        "trainingPolicy": {
            "thermalBaseF": 40, "thermalStart": "March 1", "historicalYears": "2019–" + str(max(int(key[:4]) for entry in flowering["regions"].values() for key, _ in entry["weekly"])),
            "rollingOriginHoldout": "Years 2024 onward, each trained only on previous eligible springs",
            "independentCheck": "Leave-one-year-out across all eligible springs; must also beat calendar",
            "skillGate": "At least 7 eligible springs, 3 later holdouts, maximum rolling error 14 days, both MAEs at most 9 days, 15% rolling and 10% leave-year-out improvement",
            "speciesScope": "Regional annotated flowering reporting midpoint only. No site or first-bloom forecast.",
        },
        "species": [
            {"id": "trillium-grandiflorum", "name": "Large-flowered trillium",
             "scientific": "Trillium grandiflorum", "stage": "Reported flowering",
             "sourceUrl": SOURCE_TRILLIUM, "explorerUrl": "/michigan-trillium",
             "geography": "Seven Michigan regional representative weather points and nonoverlapping observation rectangles",
             "regions": bloom},
            {"id": "ruby-throated-hummingbird", "name": "Ruby-throated Hummingbird",
             "scientific": "Archilochus colubris", "stage": "First reported spring sighting",
             "sourceUrl": SOURCE_BIRD, "explorerUrl": "/hummingbird-tracker",
             "geography": "Nearest of nine Michigan regional reference points, with source positional limits",
             "regions": birds},
        ],
        "limitations": [
            "Flowering histograms count observer submissions, not flowers; dates are weekly bins. Geographic subregions do not represent individual parks.",
            "The regional ERA5 air-temperature grid is not forest-floor soil temperature; base 40°F is an empirical index, not a species development threshold.",
            "Hummingbird spring movements are not modeled from local plant growing-degree days.",
            "Historical model error on reporter dates does not prove accuracy predicting first blooms or first biological arrivals.",
            "Results are retrospective research diagnostics. No current-year phenophase is asserted outside actual dated observations.",
        ],
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--flowering", type=Path, default=ROOT / "data/trillium-flowering-history.json")
    p.add_argument("--temperature", type=Path, default=ROOT / "data/trillium-thermal-history.json")
    p.add_argument("--hummingbird", type=Path, default=ROOT / "data/hummingbird-history.json")
    p.add_argument("--output", type=Path, default=ROOT / "data/phenology-species-trials.json")
    p.add_argument("--today", type=dt.date.fromisoformat, default=None)
    args = p.parse_args()
    result = build(json.loads(args.flowering.read_text()), json.loads(args.temperature.read_text()),
                   json.loads(args.hummingbird.read_text()), args.today)
    args.output.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n")
    blooms = result["species"][0]["regions"]
    print("Species trials: trillium 7 regions, bird 9 regions; heat skill gates passed in",
          [r["id"] for r in blooms if r["modelStatus"] == "historical-skill"])


if __name__ == "__main__":
    main()
