#!/usr/bin/env python3
"""Offline regression tests for the banked phenology field read."""
import datetime as dt
import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("field_read", Path(__file__).with_name("build-phenology-field-read.py"))
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def rows(day=dt.date(2026, 10, 31)):
    return [{"date": (day - dt.timedelta(days=7-i)).isoformat(),
             "gdd": 2000 + 6*i, "ausableTempF": 55 - i, "birdCount": 2}
            for i in range(8)]


class FieldReadTests(unittest.TestCase):
    def test_valid_complete_archive(self):
        day = dt.date(2026, 10, 31)
        result = MODULE.build(rows(day), {"observations": []}, day)
        self.assertEqual(result["status"], "current")
        heat = next(t for t in result["tracks"] if t["id"] == "heat")
        self.assertIn("+42", heat["detail"])
        river = next(t for t in result["tracks"] if t["id"] == "river")
        self.assertIn("7°F cooler", river["detail"])
        self.assertNotIn("days late", str(result).lower())
        self.assertEqual(len(result["timeline"]), 8)
        self.assertEqual(result["timeline"][0]["date"], "2026-10-24")

    def test_downward_cumulative_revision_withholds_heat_delta(self):
        records = rows()
        records[-2]["gdd"] = records[-3]["gdd"] - 15
        result = MODULE.build(records, {}, dt.date(2026, 10, 31))
        heat = next(t for t in result["tracks"] if t["id"] == "heat")
        self.assertIn("withheld", heat["detail"])
        self.assertTrue(any("declined" in q for q in result["quality"]))

    def test_missing_day_never_interpolated(self):
        result = MODULE.build(rows()[:-2] + rows()[-1:], {}, dt.date(2026, 10, 31))
        heat = next(t for t in result["tracks"] if t["id"] == "heat")
        self.assertIn("withheld", heat["detail"])

    def test_statewide_report_not_local_confirmation(self):
        day = dt.date(2026, 10, 31)
        sig = {"observations": [{"name": "Norway maple", "phase": "Falling leaves", "date": "2026-10-29"}]}
        result = MODULE.build(rows(day), sig, day)
        self.assertEqual(result["observations"][0]["scope"], "Michigan statewide")
        self.assertEqual(result["observations"][0]["evidence"], "reported-observation")
        self.assertNotIn("confirmed around Saginaw", str(result).lower())

    def test_stale_archive_cannot_show_recent_reports(self):
        day = dt.date(2026, 10, 31)
        sig = {"observations": [{"name": "Norway maple", "phase": "Falling leaves", "date": "2026-10-29"}]}
        result = MODULE.build(rows(day), sig, day + dt.timedelta(days=7))
        self.assertEqual(result["status"], "archive-only")
        self.assertFalse(result["observations"])

    def test_no_archive_fails_closed(self):
        result = MODULE.build([], {}, dt.date(2026, 11, 3))
        self.assertEqual(result["status"], "unavailable")
        self.assertFalse(result["tracks"])


if __name__ == "__main__":
    unittest.main()
