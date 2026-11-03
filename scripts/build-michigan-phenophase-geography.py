#!/usr/bin/env python3
"""Autonomous, privacy-safe regional Michigan phenophase summaries.

Data already exists at USA-NPN Nature's Notebook (dated yes/no phenophases with
public site geography) and iNaturalist (research-grade, annotated records).
This site does not request visitor uploads, coordinates, or field verification.

The output is a sample of REPORTED phenophases, not a biological abundance,
start-date, migration, statewide absence, or prediction map.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import math
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("America/Detroit")
INAT = "https://api.inaturalist.org/v1/observations"
NPN = "https://services.usanpn.org/npn_portal/observations/getObservations.json"
MAX_FETCH_BYTES = 22 * 1024 * 1024
WINDOW_DAYS = 14
MAX_INAT_PAGE = 125
MIN_INTERVAL_BETWEEN_REQUESTS = 1.15
RECORD_LIMIT = 180000


def read_date(raw):
    if not isinstance(raw, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return None
    try:
        return dt.date.fromisoformat(raw)
    except ValueError:
        return None


def safe_string(value, max_len=80):
    if not isinstance(value, str):
        return None
    value = re.sub(r"\s+", " ", value.strip())
    return value[:max_len] if 2 <= len(value) <= max_len and "<" not in value and ">" not in value else None


def distance_km(lat, lon, center):
    a, b = math.radians(lat), math.radians(center["lat"])
    x = math.radians(center["lat"] - lat)
    y = math.radians(center["lon"] - lon)
    h = math.sin(x / 2) ** 2 + math.cos(a) * math.cos(b) * math.sin(y / 2) ** 2
    return 12742 * math.asin(min(1.0, math.sqrt(h)))


def assign_region(lat, lon, config):
    if type(lat) not in (float, int) or type(lon) not in (float, int):
        return None
    if not (math.isfinite(lat) and math.isfinite(lon) and 41.6 <= lat <= 48.4 and -90.7 <= lon <= -82):
        return None
    nearest = min(config["regions"], key=lambda r: distance_km(lat, lon, r))
    # This is a broad nearest-reference catchment, not an official Michigan county boundary.
    return nearest["id"] if distance_km(lat, lon, nearest) <= config["maxAssignmentKm"] else None


def season_set(today, config):
    m = today.month
    if m in (12, 1, 2):
        return config["seasonalQueries"]["winter"]
    if 3 <= m <= 5:
        return config["seasonalQueries"]["spring"]
    if 6 <= m <= 8:
        return config["seasonalQueries"]["summer"]
    return config["seasonalQueries"]["autumn"]


def find_phase(description, kingdom, config, animal_class=None):
    if not isinstance(description, str):
        return None
    for item in config["phenophases"]:
        # NPN includes adult birds and mammals; an unqualified 'Adults' record
        # MUST NOT be reclassified as an adult insect.
        if item["id"] == "adult-insects" and animal_class != "Insecta":
            continue
        if item["id"] == "bird-calls" and kingdom != "Animalia":
            continue
        if item["id"] not in ("adult-insects", "bird-calls") and kingdom != "Plantae":
            continue
        if any(re.search(pattern, description, flags=re.IGNORECASE) for pattern in item["npnPatterns"]):
            return item["id"]
    return None


def normalize_npn(rows, config, today):
    if not isinstance(rows, list) or len(rows) > RECORD_LIMIT:
        raise ValueError("Invalid or excessive USA-NPN observation response")
    seen = set()
    out = []
    for item in rows:
        if not isinstance(item, dict) or str(item.get("phenophase_status")) != "1":
            continue
        day = read_date(item.get("observation_date"))
        if day is None or not 0 <= (today - day).days <= WINDOW_DAYS:
            continue
        if item.get("state") != "MI":
            continue
        region = assign_region(item.get("latitude"), item.get("longitude"), config)
        if not region:
            continue
        phase = find_phase(item.get("phenophase_description"), item.get("kingdom"), config,
                           animal_class=item.get("class") or item.get("taxon_class"))
        if not phase:
            continue
        site_id = item.get("site_id")
        species_id = item.get("species_id")
        individual_id = item.get("individual_id")
        if type(site_id) is not int or site_id <= 0 or type(species_id) is not int or species_id <= 0:
            continue
        name = safe_string(item.get("common_name")) or safe_string(item.get("species"))
        if not name:
            continue
        ident = (site_id, individual_id, species_id, phase, day)
        if ident in seen:
            continue
        seen.add(ident)
        out.append({
            "region": region, "phase": phase, "date": day.isoformat(), "taxon": name,
            "source": "usa-npn", "reporter": "site:" + str(site_id), "speciesKey": str(species_id),
        })
    return out


def normalize_inat(rows, phase, config, today):
    if not isinstance(rows, list) or len(rows) > MAX_INAT_PAGE:
        raise ValueError("iNaturalist sampling contract violated")
    seen, out = set(), []
    phase_def = next((x for x in config["phenophases"] if x["id"] == phase), None)
    if phase_def is None or not phase_def["inat"]:
        raise ValueError("Unknown annotated phase")
    annotation = phase_def["inat"]
    for item in rows:
        if not isinstance(item, dict) or item.get("quality_grade") != "research" or item.get("captive") is True:
            continue
        # Community research grade is NOT an independent confirmation of actual first bloom.
        # Exclude both manually and taxon-obscured positions, no exact points are published.
        if item.get("geoprivacy") not in (None, "open") or item.get("taxon_geoprivacy") not in (None, "open"):
            continue
        if item.get("obscured") is True or item.get("coordinates_obscured") is True:
            continue
        accuracy = item.get("public_positional_accuracy", item.get("positional_accuracy"))
        if accuracy is not None and (type(accuracy) not in (float, int) or not 0 <= accuracy <= 10000):
            continue
        day = read_date(item.get("observed_on"))
        if day is None or not 0 <= (today - day).days <= WINDOW_DAYS:
            continue
        coords = (item.get("geojson") or {}).get("coordinates") if isinstance(item.get("geojson"), dict) else None
        if not isinstance(coords, list) or len(coords) < 2:
            continue
        region = assign_region(coords[1], coords[0], config)
        if not region:
            continue
        taxon = item.get("taxon")
        user = item.get("user")
        if not isinstance(taxon, dict) or not isinstance(user, dict):
            continue
        taxon_id = taxon.get("id")
        user_id = user.get("id")
        if type(taxon_id) is not int or type(user_id) is not int:
            continue
        if phase == "adult-insects" and taxon.get("iconic_taxon_name") != "Insecta":
            continue
        if phase != "adult-insects" and taxon.get("iconic_taxon_name") != "Plantae":
            continue
        a = item.get("annotations")
        if not isinstance(a, list) or not any(
            isinstance(v, dict) and v.get("controlled_attribute_id") == annotation["term"]
            and v.get("controlled_value_id") == annotation["value"] for v in a
        ):
            continue
        obs_id = item.get("id")
        if type(obs_id) is not int or obs_id <= 0 or obs_id in seen:
            continue
        seen.add(obs_id)
        name = safe_string(taxon.get("preferred_common_name")) or safe_string(taxon.get("name"))
        if not name:
            continue
        out.append({
            "region": region, "phase": phase, "date": day.isoformat(), "taxon": name,
            "source": "inaturalist", "reporter": "observer:" + str(user_id), "speciesKey": str(taxon_id),
        })
    return out


def gather(records, config, today, source_health):
    by = collections.defaultdict(list)
    for row in records:
        by[(row["region"], row["phase"])].append(row)
    regions = []
    labels = {p["id"]: p for p in config["phenophases"]}
    for r in config["regions"]:
        phases = []
        for phase in labels:
            entries = by.get((r["id"], phase), [])
            if not entries:
                continue
            by_source = collections.Counter(x["source"] for x in entries)
            contributors = {src: len({x["reporter"] for x in entries if x["source"] == src})
                            for src in ("usa-npn", "inaturalist")}
            eligible = ((contributors["usa-npn"] >= 2) or (contributors["inaturalist"] >= 2)
                        or (by_source["usa-npn"] >= 1 and by_source["inaturalist"] >= 1))
            distinct_taxa = {}
            for x in entries:
                key = x["source"] + ":" + x["speciesKey"]
                if key not in distinct_taxa or x["date"] > distinct_taxa[key]["date"]:
                    distinct_taxa[key] = {"name": x["taxon"], "date": x["date"], "source": x["source"]}
            taxa = sorted(distinct_taxa.values(), key=lambda x: (x["date"],x["name"]), reverse=True)[:4]
            phases.append({
                "id": phase, "name": labels[phase]["name"], "group": labels[phase]["group"],
                "latest": max(x["date"] for x in entries),
                "sourceReports": {"usa-npn": by_source["usa-npn"], "inaturalist": by_source["inaturalist"]},
                "reportingSites": contributors["usa-npn"], "reportingObservers": contributors["inaturalist"],
                "uniqueReportingDays": len({x["date"] for x in entries}),
                "coverage": "multiple-reporters-or-sites" if eligible else "limited-sample",
                "species": taxa,
            })
        phases.sort(key=lambda p: (p["coverage"] != "multiple-reporters-or-sites",
                                   -int(p["latest"].replace("-", "")),
                                   -(p["sourceReports"]["usa-npn"] + p["sourceReports"]["inaturalist"])))
        regions.append({
            "id": r["id"], "name": r["name"], "lat": r["lat"], "lon": r["lon"],
            "phases": phases[:6], "sampledReportCount": sum(len(by.get((r["id"],phase),[])) for phase in labels),
            "hasMultipleReportingSites": any(p["coverage"] == "multiple-reporters-or-sites" for p in phases),
            # Distinguish no eligible reports from an upstream feed failure.
            "unavailableInatPhases": [v.split("/", 1)[1] for v in source_health.get("inaturalist", {}).get("missingRegions", [])
                                      if v.startswith(r["id"] + "/")],
        })
    return regions


def fetch_json(url, *, size=MAX_FETCH_BYTES):
    req = urllib.request.Request(url, headers={
        "User-Agent": "MichiganPhenology/1.0 (+https://phenology.chrisizworski.com/; science data read, daily)",
        "Accept": "application/json"
    })
    with urllib.request.urlopen(req, timeout=38) as response:
        if response.status != 200:
            raise ValueError("Source returned HTTP " + str(response.status))
        raw = response.read(size + 1)
    if len(raw) > size:
        raise ValueError("Science source response exceeded safe maximum bytes; refusing partial JSON")
    return json.loads(raw)


def acquire_npn(today, config):
    begin = today - dt.timedelta(days=WINDOW_DAYS)
    q = urllib.parse.urlencode({
        "request_src": "chrisizworski.com", "start_date": begin.isoformat(),
        "end_date": today.isoformat(), "state[0]": "MI"
    })
    data = fetch_json(NPN + "?" + q)
    return normalize_npn(data, config, today), len(data)


def inat_query(region, item, today, config):
    query = {
        "place_id": config["inaturalistPlaceId"],
        "lat": region["lat"], "lng": region["lon"], "radius": config["maxAssignmentKm"],
        "quality_grade": "research", "captive": "false",
        "d1": (today - dt.timedelta(days=WINDOW_DAYS)).isoformat(),
        "d2": today.isoformat(), "photos": "true", "order": "desc",
        "order_by": "observed_on", "per_page": MAX_INAT_PAGE,
        "term_id": item["inat"]["term"], "term_value_id": item["inat"]["value"]
    }
    if item["inat"].get("taxonId"):
        query["taxon_id"] = item["inat"]["taxonId"]
    url = INAT + "?" + urllib.parse.urlencode(query)
    data = fetch_json(url, size=8 * 1024 * 1024)
    if not isinstance(data, dict) or not isinstance(data.get("results"), list):
        raise ValueError("Malformed iNaturalist observation envelope")
    return normalize_inat(data["results"], item["id"], config, today), bool(data.get("total_results", 0) > MAX_INAT_PAGE)


def acquire_inat(today, config, *, delay=MIN_INTERVAL_BETWEEN_REQUESTS):
    phase_ids = set(season_set(today, config))
    phases = [p for p in config["phenophases"] if p["id"] in phase_ids and p["inat"]]
    records, missing, capped = [], [], 0
    for region in config["regions"]:
        for item in phases:
            try:
                results, partial = inat_query(region, item, today, config)
                records.extend(results)
                capped += int(partial)
            except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
                missing.append(region["id"] + "/" + item["id"])
                print("Source unavailable:", region["id"], item["id"], type(exc).__name__, file=sys.stderr)
            time.sleep(delay)
    # Queries overlap around region centers, so each source observation can be
    # returned several times. De-duplicate by source-verified observer/phase/date/taxon
    # before regional grouping; the closest center assigned by normalize_inat wins.
    # This errs toward undercounting repeat submissions, not inflating abundance.
    distinct = {}
    for r in records:
        key = (r["region"], r["phase"], r["date"], r["reporter"], r["speciesKey"])
        distinct[key] = r
    return list(distinct.values()), {"requests": len(config["regions"]) * len(phases),
                                     "failedRequests": len(missing), "missingRegions": sorted(set(missing)),
                                     "cappedQueries": capped, "state": "ok" if not missing else "partial"}


def build(config, npn, inat, today, *, source_health=None):
    if config.get("schema") != "michigan-observation-regions-v1" or len(config.get("regions", [])) != 9:
        raise ValueError("Invalid regional observation registry")
    rows = normalize_npn(npn, config, today)
    for phase, group in inat:
        rows.extend(normalize_inat(group, phase, config, today))
    unique = {}
    for r in rows:
        # Anonymous site/observer reporter ID remains private to this analysis,
        # and de-duplicates multiple submitted stages from the same person/day.
        key = (r["source"], r["region"], r["phase"], r["date"], r["reporter"], r["speciesKey"])
        unique[key] = r
    sources = source_health or {"usa-npn": {"state": "ok"}, "inaturalist": {"state": "ok", "missingRegions": []}}
    return {
        "schema": "michigan-phenophase-geography-v1",
        "asOfDate": today.isoformat(),
        "windowStart": (today - dt.timedelta(days=WINDOW_DAYS)).isoformat(),
        "windowEnd": today.isoformat(),
        "regions": gather(list(unique.values()), config, today, sources),
        "sourceStatus": {
            "usaNpn": sources.get("usa-npn", {}).get("state", "unavailable"),
            "iNaturalist": sources.get("inaturalist", {}).get("state", "unavailable"),
            "iNaturalistCappedQueries": sources.get("inaturalist", {}).get("cappedQueries", 0),
            "iNaturalistFailedQueries": sources.get("inaturalist", {}).get("failedRequests", 0),
        },
        "science": {
            "kind": "automatically sampled community-reported biological phases",
            "reportingLimit": "A submitted observation is not proof of first occurrence, abundance, statewide presence, or absence elsewhere.",
            "geography": "Markers represent broad nine-region reference centers, not field sites or exact observation coordinates.",
            "freshness": "Only original observation dates within the last 14 days are counted; delayed reporting can understate events.",
            "reporterCoverage": "Multiple reporting sites or observers indicate breadth of submitted evidence, not validated biological probability.",
            "sourceNpn": "https://data.usanpn.org/observations/",
            "sourceInaturalist": "https://www.inaturalist.org/observations?place_id=29",
            "noSubmissionRequired": True,
            "sampling": "Capped iNaturalist searches are partial samples; raw counts cannot be compared as relative species abundance.",
        },
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--config", type=Path, default=ROOT / "data/michigan-observation-regions.json")
    p.add_argument("--out", type=Path, default=ROOT / "data/michigan-phenophase-geography.json")
    p.add_argument("--as-of", type=dt.date.fromisoformat, default=None)
    p.add_argument("--npn-input", type=Path, default=None, help="Test-only local fixture, never fetches the network")
    p.add_argument("--inat-input", type=Path, default=None, help="Test-only local phase/records fixtures")
    p.add_argument("--skip-inat", action="store_true", help="Explicit source outage simulation, not silent missing observations")
    args = p.parse_args()
    today = args.as_of or dt.datetime.now(TZ).date()
    cfg = json.loads(args.config.read_text())
    npn, raw_count = (json.loads(args.npn_input.read_text()), None) if args.npn_input else acquire_npn(today, cfg)
    if args.inat_input:
        chunks = [(item["phase"], item["records"]) for item in json.loads(args.inat_input.read_text())]
        health = {"state": "offline-fixture", "failedRequests": 0, "missingRegions": [], "cappedQueries": 0}
    elif args.skip_inat:
        chunks = []
        health = {"state": "unavailable", "failedRequests": 27, "missingRegions": [], "cappedQueries": 0}
    else:
        # Production uses the same biological normalization and privacy filters
        # as the offline science tests. Missing iNaturalist data is labeled partial.
        phase_ids = set(season_set(today, cfg))
        phase_defs = [x for x in cfg["phenophases"] if x["id"] in phase_ids and x["inat"]]
        chunks, missing, cap = [], [], 0
        for reg in cfg["regions"]:
            for phase in phase_defs:
                try:
                    got, clipped = inat_query(reg, phase, today, cfg)
                    # The query result has already been independently filtered.
                    chunks.append((phase["id"], []))  # will inject sanitized reports below
                    chunks[-1] = (phase["id"], got)
                    cap += int(clipped)
                except Exception as exc:
                    missing.append(reg["id"] + "/" + phase["id"])
                    print("iNaturalist limited:", reg["id"], phase["id"], type(exc).__name__, file=sys.stderr)
                time.sleep(MIN_INTERVAL_BETWEEN_REQUESTS)
        health = {"state": "ok" if not missing else "partial", "failedRequests": len(missing),
                  "missingRegions": missing, "cappedQueries": cap}
        # Already normalized source reports are kept separate from raw fixture chunks.
        normalized = [row for _,rows in chunks for row in rows]
        chunks = []
    source_health = {
        "usa-npn": {"state": "ok"},
        "inaturalist": health,
    }
    result = build(cfg, npn, chunks, today, source_health=source_health)
    if not args.inat_input and not args.skip_inat:
        # Re-group with approved, normalized iNat reports (not raw JSON).
        rows = normalize_npn(npn, cfg, today) + normalized
        dedup = {}
        for row in rows:
            key = (row["source"], row["region"], row["phase"], row["date"], row["reporter"], row["speciesKey"])
            dedup[key] = row
        result["regions"] = gather(list(dedup.values()), cfg, today, source_health)
    args.out.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n")
    print("Michigan reported phenophases", today, "| NPN raw:", raw_count,
          "| sampled regional groups", sum(len(x["phases"]) for x in result["regions"]),
          "| iNaturalist:", health["state"], "failed queries:", health["failedRequests"])


if __name__ == "__main__":
    main()
