#!/usr/bin/env python3
"""Reviewed, interval-censored trillium onset and paired on-site microclimate.

A date is NEVER the true first flower unless it has an independent observation
record. Last No / First Yes defines an onset interval, not an exact bloom date.
Historical air-temperature grids NEVER substitute for a soil logger at a patch.
Only one predesignated A plot per preserve-year can contribute to calibration.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from statistics import median
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SITES = (
    ("warren-dunes", "Warren Dunes wooded study area"),
    ("warren-woods", "Warren Woods Nature Study Area"),
    ("trillium-ravine", "Trillium Ravine Nature Sanctuary"),
    ("nan-weston", "Nan Weston Nature Preserve"),
    ("trillium-trail", "Trillium Trail Nature Sanctuary"),
    ("hoffmaster", "P.J. Hoffmaster spring wildflower hikes"),
    ("portage-point", "Portage Point Woods Preserve"),
    ("hoogland", "Hoogland Family Nature Preserve"),
    ("woollam", "John Arthur Woollam Preserve"),
    ("echo-lake", "Echo Lake Nature Preserve"),
)
SITE_IDS = {sid for sid, _ in SITES}
PLOTS = {"A", "B", "C"}
STATES = {"yes", "no", "uncertain"}
NPN = "https://www.usanpn.org/nn/faq"
ISSUE = "https://github.com/izworskic/phenology-michigan/issues/"
SPRING_START, SPRING_END = "03-15", "06-30"
MAX_BRACKET_DAYS = 4
BASE_SOIL_F = 40.0
MIN_ELIGIBLE_SITE_YEARS = 8
MIN_ROLLING_HOLDOUTS = 3


def day(s: str) -> dt.date:
    if not isinstance(s, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        raise ValueError("Date must be YYYY-MM-DD")
    return dt.date.fromisoformat(s)


def good_date(s, as_of):
    d = day(s)
    if not 2010 <= d.year <= as_of.year or d > as_of or not SPRING_START <= d.strftime("%m-%d") <= SPRING_END:
        raise ValueError("Observation outside historical spring or in the future")
    return d


def issue_url(issue):
    return f"{ISSUE}{issue}"


def validate_visits(archive, as_of):
    if archive.get("schemaVersion") != 1 or archive.get("species") != "Trillium grandiflorum" or archive.get("phenophase") != "open_flowers":
        raise ValueError("Wrong monitored species, stage, or visit schema")
    valid, seen, seen_issues = [], set(), set()
    if not isinstance(archive.get("visits"), list):
        raise ValueError("Visits must be an array")
    for v in archive["visits"]:
        if not isinstance(v, dict) or v.get("siteId") not in SITE_IDS or v.get("plotId") not in PLOTS:
            raise ValueError("Unknown preserve or anonymous anchor plot")
        if v.get("openFlowers") not in STATES or v.get("buds") not in STATES or v.get("snow") not in STATES:
            raise ValueError("Open flowers, buds and snow must be separately checked yes/no/uncertain")
        if v["openFlowers"] == "yes" and v["buds"] == "no":
            raise ValueError("Open fresh flowers imply flowers/buds is also yes")
        obs = good_date(v.get("observedAt"), as_of)
        reviewed = day(v.get("reviewedAt"))
        if reviewed < obs or reviewed > as_of:
            raise ValueError("Review must follow visit and may not be future")
        if not re.fullmatch(r"[a-zA-Z0-9_-]{3,39}", str(v.get("reviewedBy", ""))):
            raise ValueError("An editor identity is required")
        if v.get("siteProofReviewed") is not True or v.get("speciesChecked") is not True or v.get("unitStable") is not True:
            raise ValueError("Reviewed site identity, species, and stable repeat plot are mandatory")
        if len(str(v.get("reviewNote", "")).strip()) < 30 or len(str(v.get("reviewNote", ""))) > 900:
            raise ValueError("Substantive reviewer evidence is required")
        issue = v.get("issueNumber")
        if type(issue) is not int or not 1 <= issue <= 99999999:
            raise ValueError("Source issue ID invalid")
        ident = (v["siteId"], v["plotId"], v["observedAt"])
        if ident in seen or issue in seen_issues:
            raise ValueError("Duplicate visit or reviewed source issue")
        seen.add(ident)
        seen_issues.add(issue)
        probe = v.get("soilProbe")
        if probe is not None:
            if (not isinstance(probe, dict) or set(probe) != {"fahrenheit", "depthCm", "method"}
                    or probe["method"] != "field_probe" or not isinstance(probe["depthCm"], int)
                    or not 2 <= probe["depthCm"] <= 20
                    or type(probe["fahrenheit"]) not in (int, float)
                    or not math.isfinite(probe["fahrenheit"]) or not 15 <= probe["fahrenheit"] <= 95):
                raise ValueError("A dated spot check needs valid depth and field-probe provenance")
        # Never copy free-text review notes, plant locations or contributor IDs into public summary.
        valid.append({**v, "_observed": obs})
    return sorted(valid, key=lambda x: (x["siteId"], x["plotId"], x["observedAt"]))


def validate_soil(archive, as_of):
    if archive.get("schemaVersion") != 1 or not isinstance(archive.get("seasons"), list):
        raise ValueError("Bad measured soil temperature archive")
    seasons = {}
    for s in archive["seasons"]:
        if not isinstance(s, dict) or s.get("siteId") not in SITE_IDS or s.get("plotId") not in PLOTS:
            raise ValueError("Unknown soil logger preserve/plot")
        year = s.get("year")
        if type(year) is not int or year < 2010 or year > as_of.year:
            raise ValueError("Invalid soil monitoring year")
        if day(s.get("reviewedAt")) > as_of or day(s["reviewedAt"]) < dt.date(year, 6, 30):
            raise ValueError("Incomplete spring cannot be certified as a complete daily soil season")
        if s.get("startDate") != f"{year}-03-01" or s.get("endDate") != f"{year}-06-30":
            raise ValueError("Exact March–June logger coverage required")
        vals = s.get("dailyMeanSoilF")
        if (not isinstance(vals, list) or len(vals) != 122
                or any(type(x) not in (float, int) or not math.isfinite(x) or not 15 <= x <= 95 for x in vals)):
            raise ValueError("122 complete, plausible daily mean soil temperatures required")
        depth = s.get("depthCm")
        if type(depth) is not int or depth < 2 or depth > 20:
            raise ValueError("Logger soil depth must be measured")
        if not re.fullmatch(r"[A-Z0-9_-]{3,28}", str(s.get("loggerCode", ""))):
            raise ValueError("Anonymous logger code required")
        if not re.fullmatch(r"[a-zA-Z0-9_-]{3,39}", str(s.get("reviewedBy", ""))) or s.get("siteProofReviewed") is not True:
            raise ValueError("Independent documented logger review required")
        link = s.get("sourceUrl", "")
        if not isinstance(link, str) or not link.startswith("https://") or len(link) > 600:
            raise ValueError("Logger source record URL required")
        key = (s["siteId"], s["plotId"], year)
        if key in seasons:
            raise ValueError("Duplicate site/plot soil season")
        seasons[key] = s
    return seasons


def onset_from_visits(rows):
    rows = sorted(rows, key=lambda x: x["observedAt"])
    before = [r for r in rows if r["openFlowers"] == "yes"]
    counts = {"visits": len(rows), "negativeVisits": sum(r["openFlowers"] == "no" for r in rows),
              "positiveVisits": len(before), "uncertainVisits": sum(r["openFlowers"] == "uncertain" for r in rows)}
    if not before:
        status = "no-positive-yet" if counts["negativeVisits"] else "uncertain-only"
        return {"state": status, "firstYes": None, "lastNo": None,
                "gapDays": None, **counts}
    first_yes = before[0]["_observed"]
    earlier_neg = [r["_observed"] for r in rows if r["openFlowers"] == "no" and r["_observed"] < first_yes]
    latest_no = max(earlier_neg) if earlier_neg else None
    gap = (first_yes - latest_no).days if latest_no else None
    if not latest_no:
        state = "left-censored"
    elif gap <= MAX_BRACKET_DAYS and len(earlier_neg) >= 2:
        state = "bounded-onset"
    else:
        state = "wide-interval"
    return {"state": state, "firstYes": first_yes.isoformat(),
            "lastNo": latest_no.isoformat() if latest_no else None,
            "gapDays": gap, "priorNegativeVisits": len(earlier_neg),
            **counts}


def site_years(visits):
    groups = defaultdict(list)
    for r in visits:
        groups[(r["siteId"], r["plotId"], r["_observed"].year)].append(r)
    return {key: onset_from_visits(rows) for key, rows in groups.items()}


def heat_series(season):
    total, cumulative = 0.0, []
    for temp in season["dailyMeanSoilF"]:
        total += max(0.0, temp - BASE_SOIL_F)
        cumulative.append(total)
    return cumulative


def first_crossing(series, threshold, year):
    for i, total in enumerate(series):
        if total >= threshold:
            return dt.date(year, 3, 1) + dt.timedelta(days=i)
    return None


def loss(pred, last_no, first_yes):
    """Interval-aware distance. Zero means a prediction lies inside (No,Yes]."""
    if pred is None:
        return 30
    if pred <= last_no:
        return (last_no - pred).days + 1
    if pred > first_yes:
        return (pred - first_yes).days
    return 0


def fit_reference(training):
    # Fixed base-40F soil heat index. No fitted weather correction or
    # exploratory parameter tuning against held-out years.
    onset_heat = []
    midpoint = []
    for t in training:
        mid = t["lastNo"] + dt.timedelta(days=(t["firstYes"] - t["lastNo"]).days // 2)
        idx = (mid - dt.date(t["year"], 3, 1)).days
        onset_heat.append(t["heat"][idx])
        midpoint.append((dt.date(2027, mid.month, mid.day) - dt.date(2027, 1, 1)).days + 1)
    return median(onset_heat), median(midpoint)


def site_calibration(site_id, results, soil):
    anchor = []
    depth = None
    for (sid, pid, year), onset in sorted(results.items()):
        if sid != site_id or pid != "A" or onset["state"] != "bounded-onset":
            continue
        candidate = soil.get((sid, "A", year))
        if candidate is None:
            continue
        if depth is None:
            depth = candidate["depthCm"]
        if candidate["depthCm"] != depth:
            # Depth changes mean two different physical heat indices.
            continue
        anchor.append({"year": year, "lastNo": day(onset["lastNo"]),
                       "firstYes": day(onset["firstYes"]), "heat": heat_series(candidate)})
    folds = []
    for sample in anchor:
        train = [r for r in anchor if r["year"] < sample["year"]]
        if len(train) < 5:
            continue
        threshold, cal_doy = fit_reference(train)
        pred = first_crossing(sample["heat"], threshold, sample["year"])
        calendar = dt.date(sample["year"], 1, 1) + dt.timedelta(days=round(cal_doy) - 1)
        folds.append({"year": sample["year"], "intervalStartExclusive": sample["lastNo"].isoformat(),
                      "intervalEndInclusive": sample["firstYes"].isoformat(),
                      "soilDistanceDays": loss(pred, sample["lastNo"], sample["firstYes"]),
                      "calendarDistanceDays": loss(calendar, sample["lastNo"], sample["firstYes"])})
    recent = folds[-3:]
    soil_err = sum(x["soilDistanceDays"] for x in recent) / len(recent) if recent else None
    cal_err = sum(x["calendarDistanceDays"] for x in recent) / len(recent) if recent else None
    qualified = (len(anchor) >= MIN_ELIGIBLE_SITE_YEARS and len(recent) >= MIN_ROLLING_HOLDOUTS
                 and soil_err <= 3 and soil_err <= cal_err * 0.8
                 and max(x["soilDistanceDays"] for x in recent) <= 7)
    return {
        "state": "retrospectively-calibrated" if qualified else "not-calibrated",
        "pairedSeasons": len(anchor), "rollingHoldouts": len(folds),
        "soilDepthCm": depth, "recentMeanIntervalDistanceDays": round(soil_err, 1) if soil_err is not None else None,
        "calendarMeanIntervalDistanceDays": round(cal_err, 1) if cal_err is not None else None,
        "heldOut": folds, "thresholdSoilGdd40": round(fit_reference(anchor)[0], 1) if qualified else None,
        "reason": ("Retrospective soil-heat index improved interval coverage over the calendar. Not a verified future first-flower forecast."
                   if qualified else "No site-level bloom date published: repeated bounded onset years, complete same-plot soil measurements and forward-held-out skill are required."),
    }


def build(visits_archive, soil_archive, as_of):
    visits = validate_visits(visits_archive, as_of)
    soil = validate_soil(soil_archive, as_of)
    intervals = site_years(visits)
    sites = []
    for site_id, name in SITES:
        site_visits = [x for x in visits if x["siteId"] == site_id]
        rows = [{"plotId": pid, "year": year, **record}
                for (sid, pid, year), record in sorted(intervals.items()) if sid == site_id]
        has_bounds = sum(1 for x in rows if x["state"] == "bounded-onset")
        newest = max((x["_observed"] for x in site_visits), default=None)
        site = {
            "siteId": site_id, "siteName": name, "reviewedVisits": len(site_visits),
            "monitoredPlots": len({x["plotId"] for x in site_visits}),
            "yearsWithVisits": len({x["_observed"].year for x in site_visits}),
            "boundedPlotYears": has_bounds,
            "latestReviewedVisit": newest.isoformat() if newest else None,
            "onsets": rows,
            "calibration": site_calibration(site_id, intervals, soil),
        }
        sites.append(site)
    return {
        "schema": "trillium-site-onset-v1", "generatedForDate": as_of.isoformat(),
        "species": "Trillium grandiflorum", "phenophase": "open flowers",
        "sites": sites, "summary": {
            "destinations": len(sites),
            "reviewedVisits": len(visits),
            "sitesWithVisits": sum(bool(s["reviewedVisits"]) for s in sites),
            "boundedPlotYears": sum(s["boundedPlotYears"] for s in sites),
            "sitesWithCalibratedModels": sum(s["calibration"]["state"] == "retrospectively-calibrated" for s in sites),
            "completeMeasuredSoilSeasons": len(soil),
        },
        "method": {
            "source": NPN,
            "monitor": "Return to the same 1–3 accessible plants or patches and check open flowers yes/no/uncertain every 2–3 days as spring accelerates.",
            "onset": "The onset can only be placed after the last reviewed 'no' and on or before the first reviewed 'yes'.",
            "bound": "A tightly bounded interval needs at least two 'no' visits and a last-no to first-yes gap of at most four days.",
            "microclimate": "One spot soil temperature is context only. Calibration requires all 122 daily measured soil means March–June from the same depth and monitored plot.",
            "validation": "A site's anchor plot A must contribute 8 qualifying paired seasons, 3 rolling historic holdouts, and soil-model interval-distance error below calendar baseline.",
            "privacy": "Public output contains only named preserves and anonymized plot A/B/C identifiers. No precise plant coordinates, visitors, or free-text proof.",
            "warning": "No monitored or calibrated site-level bloom predictions are inferred from regional air-temperature forecasts or nearby photographs.",
        },
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--visits", type=Path, default=ROOT / "data/trillium-monitoring-visits.json")
    p.add_argument("--soil", type=Path, default=ROOT / "data/trillium-monitoring-soil.json")
    p.add_argument("--out", type=Path, default=ROOT / "data/trillium-site-onset-summary.json")
    p.add_argument("--as-of", type=dt.date.fromisoformat, default=None)
    args = p.parse_args()
    as_of = args.as_of or dt.datetime.now(ZoneInfo("America/Detroit")).date()
    result = build(json.loads(args.visits.read_text()), json.loads(args.soil.read_text()), as_of)
    args.out.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n")
    print(f"Monitored preserve trial: {result['summary']['reviewedVisits']} vetted visits, "
          f"{result['summary']['boundedPlotYears']} bounded plot-years, "
          f"{result['summary']['sitesWithCalibratedModels']} calibrated sites (date {as_of})")


if __name__ == "__main__":
    main()
