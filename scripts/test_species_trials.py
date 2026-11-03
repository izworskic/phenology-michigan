#!/usr/bin/env python3
"""Scientific regression tests for independent phenology species trials."""
import datetime as dt
import importlib.util
import json
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("species_trials", ROOT / "scripts/build-species-trials.py")
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)

def archive(path):
    return json.loads((ROOT / "data" / path).read_text())

class ModelScienceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.flowers = archive("trillium-flowering-history.json")
        cls.thermal = archive("trillium-thermal-history.json")
        cls.birds = archive("hummingbird-history.json")

    def test_existing_real_archives_and_holdout(self):
        result = M.build(self.flowers, self.thermal, self.birds, dt.date(2026, 11, 3))
        self.assertEqual(result["schema"], "phenology-species-trials-v1")
        self.assertEqual(len(result["species"][0]["regions"]), 7)
        self.assertEqual(len(result["species"][1]["regions"]), 9)
        r = {x["id"]: x for x in result["species"][0]["regions"]}
        self.assertIn(r["southeast"]["modelStatus"], ("historical-skill", "heat-date-withheld"))
        self.assertIn(r["west"]["modelStatus"], ("historical-skill", "heat-date-withheld"))
        self.assertEqual(r["southeast"]["heldOutYears"], 3)
        self.assertLess(r["southeast"]["metrics"]["rollingHeatMaeDays"],
                        r["southeast"]["metrics"]["rollingCalendarMaeDays"])
        self.assertIsNone(r["west"]["thermalReferenceGdd40"]) if r["west"]["modelStatus"] == "heat-date-withheld" else self.assertIsNotNone(r["west"]["thermalReferenceGdd40"])
        self.assertTrue(all(y["year"] >= 2024 for region in r.values() for y in region["heldOut"]))

    def test_rolling_origin_no_future_leakage(self):
        before = M.evaluate_flowering("southeast", M.TRILLIUM["southeast"], self.flowers, self.thermal)
        changed = deepcopy(self.flowers)
        # A future year's data may affect *later* folds but NEVER 2024's 2023-and-earlier training.
        changed["regions"]["southeast"]["weekly"].extend([["2026-06-15", 900], ["2026-06-22", 900]])
        after = M.evaluate_flowering("southeast", M.TRILLIUM["southeast"], changed, self.thermal)
        self.assertEqual(before["heldOut"][0], after["heldOut"][0])

    def test_bloom_reports_and_thermal_are_distinct(self):
        r = M.evaluate_flowering("central", M.TRILLIUM["central"], self.flowers, self.thermal)
        self.assertIn("weekly-annotated-flowering-report", r["evidence"])
        self.assertNotIn("first bloom", r["modelStatus"])
        self.assertLess(r["availableYears"], 8)

    def test_birds_have_observer_gate_not_heat_model(self):
        r = M.evaluate_bird("saginaw-bay", M.HUMMINGBIRD["saginaw-bay"], self.birds)
        self.assertEqual(r["modelStatus"], "reporting-history")
        self.assertTrue(r["historicalWindowAvailable"])
        self.assertNotIn("thermalReferenceGdd40", r)
        poor = M.evaluate_bird("traverse-city", M.HUMMINGBIRD["traverse-city"], self.birds)
        self.assertEqual(poor["modelStatus"], "insufficient-reporting")
        self.assertIsNone(poor["typicalCenter"])

    def test_geographic_mismatch_and_source_type_fail_closed(self):
        weather = deepcopy(self.thermal)
        weather["regions"]["central"]["coordinate"][0] += 0.15
        with self.assertRaisesRegex(ValueError, "location mismatch"):
            M.build(self.flowers, weather, self.birds)
        bad = deepcopy(self.flowers)
        bad["species"] = "Trillium erectum"
        with self.assertRaisesRegex(ValueError, "Incompatible"):
            M.build(bad, self.thermal, self.birds)

    def test_calendar_leap_and_data_gaps(self):
        self.assertIsNone(M.doy("2024-02-29"))
        self.assertIsNone(M.read_thermal([42] * 100))
        self.assertIsNone(M.read_thermal([42] * 121 + [None]))
        self.assertEqual(M.crossing([0, 10, 21], 12), 62)
        self.assertIsNone(M.crossing([0, 10, 11], 12))

    def test_research_not_unverified_live_bloom(self):
        result = M.build(self.flowers, self.thermal, self.birds)
        rendered = json.dumps(result).lower()
        self.assertNotIn('"probability"', rendered)
        self.assertIn("not actual first bloom", rendered)
        self.assertIn("reporting", rendered)

if __name__ == "__main__":
    unittest.main()
