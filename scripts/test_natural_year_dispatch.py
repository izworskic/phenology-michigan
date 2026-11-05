#!/usr/bin/env python3
"""Offline tests: statewide observations stay statewide, sparse history stays sparse."""
import datetime as dt
import importlib.util
import json
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("dispatch", ROOT / "scripts/build-natural-year-dispatch.py")
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)

def data(name):
    return json.loads((ROOT / "data" / name).read_text())

class DispatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = data("natural-year-connections.json")
        cls.signals = data("signals.json")
        # A fixed 2026-11-03 scenario must not depend on a *live* daily feed.
        # All observations here are synthetic test inputs, never published.
        cls.fixed_signals = {
            "generatedAt": "2026-11-03T16:00:00.000Z",
            "observations": [
                {"name": "Norway maple", "phase": "Colored leaves",
                 "date": "2026-11-01", "kingdom": "Plantae"},
                {"name": "Fox squirrel", "phase": "Nut gathering",
                 "date": "2026-11-02", "kingdom": "Animalia"},
            ],
        }
        cls.trials = data("phenology-species-trials.json")

    def test_fixed_michigan_fall_sample_has_honest_scope(self):
        out = M.build(self.catalog, self.fixed_signals, self.trials, dt.date(2026, 11, 3))
        self.assertEqual(out["schema"], "natural-year-dispatch-v1")
        self.assertEqual(len(out["historicalRegions"]), 7)
        self.assertIn("leaf-change", [e["id"] for e in out["active"]])
        self.assertIn("lake-smoke", [e["id"] for e in out["active"]])
        self.assertTrue(all(e["state"] == "usual-calendar-window" for e in out["active"]))
        self.assertTrue(all(e["state"] == "upcoming-calendar-window" for e in out["upcoming"]))
        self.assertTrue(all(e["daysUntilStart"] > 0 for e in out["upcoming"]))
        self.assertEqual(out["reportsState"], "recent-statewide-reports")
        self.assertTrue(out["reports"])
        self.assertTrue(all("not independently verified" in r["geography"] for r in out["reports"]))
        self.assertFalse(any("Bay City" in r["geography"] for r in out["reports"]))
        self.assertFalse(any("probability" in json.dumps(x).lower() for x in out["reports"]))

    def test_stale_signal_bundle_cannot_look_current(self):
        stale = deepcopy(self.fixed_signals)
        stale["generatedAt"] = "2026-09-04T13:00:00.000Z"
        out = M.build(self.catalog, stale, self.trials, dt.date(2026, 11, 3))
        self.assertEqual(out["reportsState"], "archive-only")
        self.assertEqual(out["reports"], [])
        self.assertTrue(out["active"], "The editorial calendar remains useful but is not a field sighting")

    def test_undated_future_and_duplicate_reports_are_excluded(self):
        signals = deepcopy(self.fixed_signals)
        signals["observations"] = [
            {"name":"Norway maple","phase":"Colored leaves","date":"2026-11-01","kingdom":"Plantae"},
            {"name":"Norway maple","phase":"Colored leaves","date":"2026-11-01","kingdom":"Plantae"},
            {"name":"Fox squirrel","phase":"Nut gathering","date":"2026-11-09","kingdom":"Animalia"},
            {"name":"Redwing","phase":"Calls","date":"2026-09-01","kingdom":"Animalia"},
        ]
        out = M.build(self.catalog, signals, self.trials, dt.date(2026, 11, 3))
        self.assertEqual(len(out["reports"]), 1)
        self.assertEqual(out["reports"][0]["evidence"], "statewide-reported-phenophase")

    def test_future_signal_bundle_is_not_misrepresented_as_past_observation(self):
        # This was the original CI regression: a live Nov 4 bundle was used
        # against a fixed Nov 3 historical scenario.
        future = deepcopy(self.fixed_signals)
        future["generatedAt"] = "2026-11-04T16:00:00.000Z"
        out = M.build(self.catalog, future, self.trials, dt.date(2026, 11, 3))
        self.assertEqual(out["reportsState"], "archive-only")
        self.assertEqual(out["reports"], [])

    def test_report_year_winter_window_wraps_without_fabricating_a_sighting(self):
        jan = M.build(self.catalog, {}, self.trials, dt.date(2027, 1, 10))
        ids = [e["id"] for e in jan["active"]]
        self.assertIn("lake-smoke", ids)
        self.assertNotIn("trillium", ids)
        self.assertEqual(jan["reports"], [])
        self.assertNotIn("spring index", json.dumps(jan["reports"]).lower())

    def test_species_coverage_and_unavailable_region_history(self):
        out = M.build(self.catalog, self.signals, self.trials, dt.date(2026, 11, 3))
        by = {region["id"]: region for region in out["historicalRegions"]}
        self.assertEqual(by["eastup"]["hummingbird"], None)
        self.assertEqual(by["eastup"]["birdSampleRegion"], None)
        self.assertTrue(by["saginaw-bay"]["trillium"])
        if by["saginaw-bay"]["hummingbird"]:
            self.assertEqual(by["saginaw-bay"]["hummingbird"]["event"], "first-public-spring-report")
        self.assertEqual(by["southeast"]["trillium"]["event"], "regional-flowering-report-weeks")

    def test_suppress_unsupported_hummingbird_dates(self):
        bad = deepcopy(self.trials)
        region = bad["species"][1]["regions"][0]
        region["historicalWindowAvailable"] = False
        region["typicalStart"] = "04-02"
        out = M.build(self.catalog, self.signals, bad, dt.date(2026, 11, 3))
        self.assertIsNone(next(x for x in out["historicalRegions"] if x["id"] == "southeast")["hummingbird"])

    def test_invalid_source_registry_fails_closed(self):
        bad = deepcopy(self.catalog)
        bad["experiences"][0]["url"] = "https://evil.example/new-tool"
        with self.assertRaises(ValueError):
            M.build(bad, self.signals, self.trials, dt.date(2026, 11, 3))
        bad = deepcopy(self.catalog)
        bad["experiences"][0]["startDoy"] = 400
        with self.assertRaises(ValueError):
            M.build(bad, self.signals, self.trials, dt.date(2026, 11, 3))

if __name__ == "__main__":
    unittest.main()
