#!/usr/bin/env python3
"""Offline regression tests for the banked phenology field read."""
import datetime as dt
import importlib.util
import unittest
from pathlib import Path
from python_intelligence.quality import prepare_archive, evidence_window
from python_intelligence.scorecard import assess_candidate

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
        self.assertEqual(len(result["timeline"]), 28)
        self.assertEqual(result["timeline"][0]["date"], "2026-10-04")
        self.assertEqual(result["timeline"][0]["riverF"], None)
        self.assertEqual(result["timeline"][-1]["date"], "2026-10-31")
        self.assertEqual(result["dataIntegrity"]["riverDays"], 8)
        self.assertEqual(result["dataIntegrity"]["heatDays"], 8)

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

    def test_missing_day_is_explicit_null_slot(self):
        records = rows()
        records.pop(3)
        result = MODULE.build(records, {}, dt.date(2026, 10, 31))
        self.assertEqual(len(result["timeline"]), 28)
        missing = "2026-10-27"
        self.assertIn(missing, result["dataIntegrity"]["missingDates"])
        slot = next(x for x in result["timeline"] if x["date"] == missing)
        self.assertIsNone(slot["riverF"])
        self.assertIsNone(slot["heatGdd"])

    def test_duplicate_archive_dates_are_rejected_not_selected(self):
        records = rows()
        conflicting = dict(records[3])
        conflicting["ausableTempF"] = 99
        records.append(conflicting)
        result = MODULE.build(records, {}, dt.date(2026, 10, 31))
        self.assertIn(records[3]["date"], result["dataIntegrity"]["duplicateDates"])
        slot = next(x for x in result["timeline"] if x["date"] == records[3]["date"])
        self.assertIsNone(slot["riverF"])
        self.assertTrue(any("Duplicate" in item for item in result["quality"]))
        self.assertIn("withheld", next(t for t in result["tracks"] if t["id"] == "heat")["detail"])

    def test_future_and_malformed_rows_are_ignored(self):
        records = rows() + [{"date": "2026-11-07", "gdd": 9999},
                            {"date": "2026-11-xx", "gdd": 3}]
        result = MODULE.build(records, {}, dt.date(2026, 10, 31))
        self.assertEqual(result["asOfDate"], "2026-10-31")
        self.assertEqual(result["dataIntegrity"]["futureRecordsExcluded"], 1)
        self.assertEqual(result["dataIntegrity"]["invalidRecordsExcluded"], 1)

    def test_cross_year_reset_not_called_a_revision(self):
        as_of = dt.date(2027, 1, 3)
        records = [{"date": (dt.date(2026, 12, 30) + dt.timedelta(days=i)).isoformat(),
                    "gdd": v, "ausableTempF": 44} for i, v in enumerate((2400, 2401, 0, 2, 4))]
        clean, audit = prepare_archive(records, as_of)
        report = evidence_window(clean, as_of, audit=audit)
        self.assertEqual(report["heatRevisionDates"], [])
        self.assertEqual(report["heatDays"], 5)

    def test_revision_detected_beyond_week_window(self):
        day = dt.date(2026, 10, 31)
        records = [{"date": (day - dt.timedelta(days=20-i)).isoformat(),
                    "gdd": 100 + i, "ausableTempF": 54} for i in range(21)]
        records[3]["gdd"] = 20
        result = MODULE.build(records, {}, day)
        self.assertIn(records[3]["date"], result["dataIntegrity"]["heatRevisionDates"])

    def test_os_scorecard_cannot_bypass_evidence_gate(self):
        scores = dict(visitorDecision=5, evidenceReliability=5, experienceValue=5,
                      performanceCost=5, discoveryOpportunity=5)
        gates = dict(sourceLegal=False, validatedEvidence=True,
                     fallbackSafe=True, ownerVerified=True)
        result = assess_candidate(scores, gates)
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["decision"], "BLOCKED")
        self.assertIn("sourceLegal", result["blockedBy"])

    def test_os_scorecard_rejects_incomplete_values(self):
        with self.assertRaises(ValueError):
            assess_candidate({"visitorDecision": 5}, {})


if __name__ == "__main__":
    unittest.main()
