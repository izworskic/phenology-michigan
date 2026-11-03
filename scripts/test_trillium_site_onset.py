#!/usr/bin/env python3
"""Site-level science tests, including explicitly SYNTHETIC counterexamples."""
import datetime as dt
import importlib.util
import json
import unittest
from pathlib import Path
from copy import deepcopy

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("onset", ROOT / "scripts/build-trillium-site-onset.py")
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)

NOW = dt.date(2027, 7, 15)
SITE = M.SITES[0][0]


def visit(date, status, number, *, plot="A", buds=None):
    return {"siteId": SITE, "plotId": plot,
            "observedAt": date, "openFlowers": status,
            "buds": buds or ("yes" if status == "yes" else "no"),
            "snow": "no", "reviewedAt": "2027-07-01",
            "reviewedBy": "owner-example", "siteProofReviewed": True,
            "speciesChecked": True, "unitStable": True,
            "reviewNote": "Reviewer examined a repeat observation at this same accessible plot and verified the named preserve.", "issueNumber": number}


def soil_archive(site, years, temps):
    return {"schemaVersion": 1, "seasons": [
        {"siteId": site, "plotId": "A", "year": year, "startDate": f"{year}-03-01",
         "endDate": f"{year}-06-30", "dailyMeanSoilF": [temp] * 122,
         "depthCm": 10, "loggerCode": "LOGGER-A-1",
         "reviewedBy": "owner-example", "reviewedAt": f"{year}-07-01",
         "siteProofReviewed": True, "sourceUrl": f"https://github.com/izworskic/phenology-michigan/issues/{year}"}
        for year, temp in zip(years, temps)]}


class SiteScienceTests(unittest.TestCase):
    def test_production_begins_with_zero_verified_site_observations(self):
        visits = json.loads((ROOT / "data/trillium-monitoring-visits.json").read_text())
        soil = json.loads((ROOT / "data/trillium-monitoring-soil.json").read_text())
        self.assertEqual(visits["visits"], [])
        self.assertEqual(soil["seasons"], [])
        out = M.build(visits, soil, dt.date(2026, 11, 3))
        self.assertEqual(len(out["sites"]), 10)
        self.assertEqual(out["summary"]["reviewedVisits"], 0)
        self.assertEqual(out["summary"]["boundedPlotYears"], 0)
        self.assertEqual(out["summary"]["sitesWithCalibratedModels"], 0)
        self.assertTrue(all(s["calibration"]["thresholdSoilGdd40"] is None for s in out["sites"]))
        self.assertNotIn("latitude", json.dumps(out))
        self.assertNotIn("longitude", json.dumps(out))

    def test_no_then_yes_is_an_interval_not_exact_onset(self):
        rows = [
            {**visit("2027-04-19", "no", 1), "_observed": dt.date(2027, 4, 19)},
            {**visit("2027-04-22", "no", 2), "_observed": dt.date(2027, 4, 22)},
            {**visit("2027-04-25", "yes", 3), "_observed": dt.date(2027, 4, 25)},
        ]
        out = M.onset_from_visits(rows)
        self.assertEqual(out["state"], "bounded-onset")
        self.assertEqual(out["lastNo"], "2027-04-22")
        self.assertEqual(out["firstYes"], "2027-04-25")
        self.assertEqual(out["gapDays"], 3)
        self.assertEqual(M.loss(dt.date(2027, 4, 23), dt.date(2027, 4, 22), dt.date(2027, 4, 25)), 0)
        self.assertEqual(M.loss(dt.date(2027, 4, 21), dt.date(2027, 4, 22), dt.date(2027, 4, 25)), 2)
        self.assertEqual(M.loss(dt.date(2027, 4, 28), dt.date(2027, 4, 22), dt.date(2027, 4, 25)), 3)

    def test_first_yes_without_negative_is_left_censored(self):
        rows = [{**visit("2027-05-02", "yes", 4), "_observed": dt.date(2027, 5, 2)}]
        x = M.onset_from_visits(rows)
        self.assertEqual(x["state"], "left-censored")
        self.assertIsNone(x["lastNo"])

    def test_missing_or_infrequent_negative_cannot_be_strong_onset(self):
        rows = [
            {**visit("2027-04-20", "no", 8), "_observed": dt.date(2027, 4, 20)},
            {**visit("2027-04-22", "no", 9), "_observed": dt.date(2027, 4, 22)},
            {**visit("2027-04-30", "yes", 10), "_observed": dt.date(2027, 4, 30)},
        ]
        self.assertEqual(M.onset_from_visits(rows)["state"], "wide-interval")
        negatives = rows[:2]
        self.assertEqual(M.onset_from_visits(negatives)["state"], "no-positive-yet")
        unknown = [{**visit("2027-04-30", "uncertain", 11), "_observed": dt.date(2027, 4, 30)}]
        self.assertEqual(M.onset_from_visits(unknown)["state"], "uncertain-only")

    def test_malformed_and_unreviewed_reports_fail_closed(self):
        archive = {"schemaVersion": 1, "species": "Trillium grandiflorum", "phenophase": "open_flowers",
                   "visits": [visit("2027-04-25", "no", 15)]}
        M.validate_visits(archive, NOW)
        mutations = [
            {"siteId": "somewhere-private"},
            {"reviewedBy": ""},
            {"openFlowers": "none"},
            {"observedAt": "2027-08-01"},
            {"observedAt": "2028-04-25"},
            {"plotId": "GPS-43.4,-84.3"},
            {"buds": "no", "openFlowers": "yes"},
            {"siteProofReviewed": False},
            {"unitStable": False},
            {"soilProbe": {"fahrenheit": 49.1}},
        ]
        for mutation in mutations:
            x = deepcopy(archive)
            x["visits"][0].update(mutation)
            with self.subTest(mutation=mutation), self.assertRaises((ValueError, TypeError)):
                M.validate_visits(x, NOW)
        duplicate = deepcopy(archive)
        duplicate["visits"].append({**duplicate["visits"][0], "issueNumber": 16})
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            M.validate_visits(duplicate, NOW)

    def test_logger_missing_day_or_wrong_year_rejected(self):
        record = soil_archive(SITE, [2026], [50])
        M.validate_soil(record, NOW)
        broken = deepcopy(record)
        broken["seasons"][0]["dailyMeanSoilF"].pop()
        with self.assertRaisesRegex(ValueError, "122"):
            M.validate_soil(broken, NOW)
        broken = deepcopy(record)
        broken["seasons"][0]["depthCm"] = None
        with self.assertRaises(ValueError):
            M.validate_soil(broken, NOW)

    def test_incomplete_paired_evidence_never_trains_model(self):
        rows = [
            {**visit("2027-04-19", "no", 21), "_observed": dt.date(2027, 4, 19)},
            {**visit("2027-04-22", "no", 22), "_observed": dt.date(2027, 4, 22)},
            {**visit("2027-04-25", "yes", 23), "_observed": dt.date(2027, 4, 25)},
        ]
        intervals = {(SITE, "A", 2027): M.onset_from_visits(rows)}
        result = M.site_calibration(SITE, intervals, {})
        self.assertEqual(result["state"], "not-calibrated")
        self.assertEqual(result["pairedSeasons"], 0)
        self.assertIsNone(result["thresholdSoilGdd40"])

    def test_synthetic_eight_years_can_prove_pipeline_works(self):
        # SYNTHETIC only; these records must NEVER go into production data.
        years = list(range(2018, 2026))
        daily_temps = [48, 52, 49, 53, 50, 54, 47, 55]
        series = M.validate_soil(soil_archive(SITE, years, daily_temps), dt.date(2027, 7, 15))
        intervals = {}
        for i, year in enumerate(years):
            predicted = M.first_crossing(M.heat_series(series[(SITE, "A", year)]), 500, year)
            self.assertIsNotNone(predicted)
            # Observed yes 1 day after the threshold; no immediately before it.
            last_no = predicted - dt.timedelta(days=1)
            first_yes = predicted + dt.timedelta(days=1)
            intervals[(SITE, "A", year)] = {
                "state": "bounded-onset", "lastNo": last_no.isoformat(),
                "firstYes": first_yes.isoformat(), "gapDays": 2}
        result = M.site_calibration(SITE, intervals, series)
        self.assertEqual(result["pairedSeasons"], 8)
        self.assertEqual(result["rollingHoldouts"], 3)
        self.assertLessEqual(result["recentMeanIntervalDistanceDays"], 3)
        self.assertEqual(result["state"], "retrospectively-calibrated")

if __name__ == "__main__":
    unittest.main()
