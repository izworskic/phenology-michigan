#!/usr/bin/env python3
"""Independent scientific regression tests for the archived reporting timeline.

All modified inputs are test-only fixtures; no synthetic nature observations are
written to the production archive.
"""
import datetime as dt
import importlib.util
import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "phenophase_archive", ROOT / "scripts/archive-michigan-phenophase.py")
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)

def read(path):
    return json.loads((ROOT / path).read_text())

class ArchiveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = read("data/michigan-observation-regions.json")
        cls.real_geo = read("data/michigan-phenophase-geography.json")
        # Stable synthetic test dates only: daily field data will update tomorrow
        # and must not make historical edge-case tests nonrepeatable.
        cls.geo = deepcopy(cls.real_geo)
        cls.geo["asOfDate"] = "2026-11-03"
        cls.geo["windowStart"] = "2026-10-20"
        cls.geo["windowEnd"] = "2026-11-03"
        cls.geo["sourceStatus"]["usaNpn"] = "ok"
        cls.geo["sourceStatus"]["iNaturalist"] = "ok"
        cls.geo["sourceStatus"]["iNaturalistFailedQueries"] = 0
        cls.geo["sourceStatus"]["iNaturalistCappedQueries"] = 0
        for region in cls.geo["regions"]:
            region["unavailableInatPhases"] = []
            for phase in region["phases"]:
                phase["latest"] = "2026-11-03"
                for species in phase["species"]:
                    species["date"] = "2026-11-03"

    def test_first_captured_day_is_real_published_snapshot_not_reconstructed_events(self):
        archive = read("data/michigan-phenophase-archive/2026.json")
        index = read("data/michigan-phenophase-archive-index.json")
        M.validate_archive(archive, 2026, self.config)
        self.assertEqual(archive["snapshots"][0]["asOfDate"], "2026-11-03")
        self.assertEqual(archive["snapshots"][0]["windowStart"], "2026-10-20")
        self.assertEqual(archive["snapshots"][0]["windowEnd"], "2026-11-03")
        self.assertEqual(archive["snapshots"][0]["kind"],
                         "overlapping-14-day-reporting-snapshot")
        self.assertGreaterEqual(len(archive["snapshots"]), 1)
        self.assertEqual(index["snapshotCount"],sum(x["snapshotDays"] for x in index["years"]))
        self.assertTrue(index["interpretation"]["oneSnapshotPerCollectionDay"])
        self.assertFalse(index["interpretation"]["visitorSubmissionsRequired"])
        self.assertEqual(archive["snapshots"][0]["sourceStatus"]["usaNpn"], "ok")

    def test_snapshot_is_only_reviewed_public_regional_data(self):
        latest = dt.date.fromisoformat(self.real_geo["asOfDate"])
        live = M.snapshot_from_geography(self.real_geo, self.config, latest)
        self.assertEqual(live["asOfDate"], self.real_geo["asOfDate"])
        snap = M.snapshot_from_geography(self.geo, self.config, dt.date(2026, 11, 3))
        self.assertEqual(len(snap["regions"]), 9)
        self.assertEqual(snap["regions"][4]["id"], "saginaw-bay")
        self.assertEqual(snap["regions"][4]["sampledReports"],
                         self.geo["regions"][4]["sampledReportCount"])
        out = json.dumps(snap)
        for raw in ('"latitude"', '"longitude"', '"lat"', '"lon"', '"site_id"',
                    '"individual_id"', '"reporter"', '"geojson"', '"user_id"',
                    '"positional_accuracy"', '"gps"', '"reviewer"'):
            self.assertNotIn(raw, out, raw)
        self.assertIn('"species"', out, "Public species-name examples remain useful")

    def test_each_overlap_is_a_separate_immutable_snapshot_never_summed(self):
        first = M.snapshot_from_geography(self.geo, self.config, dt.date(2026, 11, 3))
        a, status = M.add_snapshot(None, first, self.config)
        self.assertEqual(status, "captured")
        a, again = M.add_snapshot(a, first, self.config)
        self.assertEqual(again, "already-archived-immutable")
        self.assertEqual(len(a["snapshots"]), 1)
        later_geo = deepcopy(self.geo)
        later_geo["asOfDate"] = "2026-11-04"
        later_geo["windowStart"] = "2026-10-21"
        later_geo["windowEnd"] = "2026-11-04"
        # Synthetic future sample: preserve overlapping report counts, but make
        # the dated example sightings consistent with the new fetch window.
        for region in later_geo["regions"]:
            for phase in region["phases"]:
                phase["latest"] = "2026-11-04"
                for item in phase["species"]:
                    item["date"] = "2026-11-04"
        second = M.snapshot_from_geography(later_geo, self.config, dt.date(2026, 11, 4))
        a, stat = M.add_snapshot(a, second, self.config)
        self.assertEqual(stat, "captured")
        self.assertEqual(len(a["snapshots"]), 2)
        self.assertEqual(a["snapshots"][0]["asOfDate"], "2026-11-03")
        self.assertEqual(a["snapshots"][1]["asOfDate"], "2026-11-04")
        self.assertEqual(a["snapshots"][0]["regions"][4]["sampledReports"], 4)
        self.assertEqual(a["snapshots"][1]["regions"][4]["sampledReports"], 4)
        index = M.index_from_archives([a])
        self.assertEqual(index["snapshotCount"], 2)
        self.assertNotIn("totalReports", index,
                         "Overlapping 14-day counts must never be accumulated")
        changed = deepcopy(second)
        changed["regions"][4]["sampledReports"] = 0
        unchanged, result = M.add_snapshot(a, changed, self.config)
        self.assertEqual(result, "already-archived-immutable")
        self.assertEqual(unchanged, a, "A failed same-day refresh cannot rewrite the original")

    def test_missing_days_remain_gaps_not_zeros(self):
        first = M.snapshot_from_geography(self.geo, self.config, dt.date(2026, 11, 3))
        a, _ = M.add_snapshot(None, first, self.config)
        late = deepcopy(first)
        late["asOfDate"] = "2026-11-08"
        late["windowStart"] = "2026-10-25"
        late["windowEnd"] = "2026-11-08"
        for region in late["regions"]:
            for phase in region["phases"]:
                phase["latest"] = "2026-11-08"
                for item in phase["species"]:
                    item["date"] = "2026-11-08"
        a, _ = M.add_snapshot(a, late, self.config)
        idx = M.index_from_archives([a])
        self.assertEqual(idx["years"][0]["missingCollectionDaysBetweenSnapshots"], 4)
        self.assertEqual(idx["years"][0]["snapshotDays"], 2)
        self.assertEqual(len(a["snapshots"]), 2)

    def test_initial_year_rollover_does_not_merge_two_calendar_years(self):
        last = M.snapshot_from_geography(self.geo, self.config, dt.date(2026, 11, 3))
        dec = deepcopy(last)
        dec["asOfDate"] = "2026-12-31"
        dec["windowStart"] = "2026-12-17"
        dec["windowEnd"] = "2026-12-31"
        for region in dec["regions"]:
            region["sampledReports"] = 0
            region["phases"] = []
        jan = deepcopy(last)
        jan["asOfDate"] = "2027-01-01"
        jan["windowStart"] = "2026-12-18"
        jan["windowEnd"] = "2027-01-01"
        for region in jan["regions"]:
            region["sampledReports"] = 0
            region["phases"] = []
        older, _ = M.add_snapshot(None, dec, self.config)
        newer, _ = M.add_snapshot(None, jan, self.config)
        out = M.index_from_archives([newer, older])
        self.assertEqual([r["year"] for r in out["years"]], [2026, 2027])
        self.assertEqual([r["snapshotDays"] for r in out["years"]], [1, 1])
        self.assertEqual(out["years"][1]["missingCollectionDaysBetweenSnapshots"], 0)

    def test_uncertain_or_stale_feed_is_not_silently_archived(self):
        for patch in [
            {"asOfDate": "2026-11-02"},
            {"asOfDate": "2026-11-04"},
            {"windowStart": "2026-10-19"},
            {"windowEnd": "2026-11-02"},
            {"sourceStatus": {**self.geo["sourceStatus"], "usaNpn": "unavailable"}},
            {"science": {**self.geo["science"], "noSubmissionRequired": False}},
            {"science": {**self.geo["science"], "sourceNpn": "https://untrusted.example"}},
        ]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                M.snapshot_from_geography({**deepcopy(self.geo), **patch},
                                           self.config, dt.date(2026, 11, 3))

    def test_partial_inaturalist_source_has_explicit_provenance(self):
        geo = deepcopy(self.geo)
        geo["sourceStatus"]["iNaturalist"] = "partial"
        geo["sourceStatus"]["iNaturalistFailedQueries"] = 2
        geo["regions"][4]["unavailableInatPhases"] = ["flowering"]
        result = M.snapshot_from_geography(geo, self.config, dt.date(2026, 11, 3))
        self.assertEqual(result["sourceStatus"]["iNaturalist"], "partial")
        self.assertEqual(result["sourceStatus"]["iNaturalistFailedQueries"], 2)
        self.assertIn("flowering",result["regions"][4]["unavailableInatPhases"])

    def test_bad_archive_schema_duplicates_and_extra_personal_fields_rejected(self):
        first = M.snapshot_from_geography(self.geo, self.config, dt.date(2026, 11, 3))
        archive = {"schema":M.ARCHIVE_SCHEMA,"year":2026,"snapshots":[first]}
        M.validate_archive(archive, 2026, self.config)
        bad = deepcopy(archive)
        bad["snapshots"].append(deepcopy(first))
        with self.assertRaises(ValueError):
            M.validate_archive(bad, 2026, self.config)
        bad = deepcopy(archive)
        bad["snapshots"][0]["regions"][0]["lat"] = 42.123456
        with self.assertRaises(ValueError):
            M.validate_archive(bad, 2026, self.config)
        bad = deepcopy(archive)
        bad["snapshots"][0]["regions"][0]["phases"][0]["observer_id"] = 42
        with self.assertRaises(ValueError):
            M.validate_archive(bad, 2026, self.config)

    def test_result_has_no_private_fields_and_is_readable_at_year_boundary(self):
        with tempfile.TemporaryDirectory() as d:
            directory = Path(d)
            snap = M.snapshot_from_geography(self.geo,self.config,dt.date(2026,11,3))
            old, _ = M.add_snapshot(None,snap,self.config)
            (directory/"2026.json").write_text(json.dumps(old))
            future = deepcopy(snap)
            future["asOfDate"] = "2027-01-01"
            future["windowStart"] = "2026-12-18"
            future["windowEnd"] = "2027-01-01"
            for region in future["regions"]:
                region["sampledReports"] = 0
                region["phases"] = []
            next_year, _ = M.add_snapshot(None,future,self.config)
            (directory/"2027.json").write_text(json.dumps(next_year))
            index = M.index_from_archives([M.validate_archive(json.loads(f.read_text()),int(f.stem),self.config)
                                           for f in sorted(directory.glob("*.json"))])
            self.assertEqual(index["snapshotCount"],2)
            self.assertEqual(len(index["years"]),2)

if __name__ == "__main__":
    unittest.main()
