#!/usr/bin/env python3
"""No simulated field records may be committed; synthetic rows are TESTS ONLY."""
import datetime as dt
import importlib.util
import json
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("geography", ROOT/"scripts/build-michigan-phenophase-geography.py")
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)
CONFIG = json.loads((ROOT/"data/michigan-observation-regions.json").read_text())
NOW = dt.date(2026, 11, 3)


def npn(**kw):
    obj = {
        "observation_id": 123, "site_id": 550, "individual_id": 18,
        "species_id": 742, "state": "MI", "latitude": 43.61, "longitude": -83.89,
        "observation_date": "2026-11-01", "phenophase_status": 1,
        "kingdom": "Plantae", "common_name": "red maple",
        "phenophase_description": "Colored leaves"
    }
    obj.update(kw)
    return obj


def inat(**kw):
    obj = {
        "id": 1234, "quality_grade": "research", "captive": False, "geoprivacy": None,
        "taxon_geoprivacy": "open", "obscured": False, "coordinates_obscured": False,
        "public_positional_accuracy": 180, "observed_on": "2026-11-01",
        "geojson": {"coordinates": [-83.89, 43.61]},
        "user": {"id": 3},
        "taxon": {"id": 144, "preferred_common_name": "red maple", "iconic_taxon_name": "Plantae"},
        "annotations": [{"controlled_attribute_id": 36, "controlled_value_id": 39}],
    }
    obj.update(kw)
    return obj


class GeographyScienceTests(unittest.TestCase):
    def test_regions_are_existing_familiar_michigan_centers(self):
        self.assertEqual(len(CONFIG["regions"]), 9)
        for r in CONFIG["regions"]:
            self.assertEqual(M.assign_region(r["lat"],r["lon"],CONFIG),r["id"])
        self.assertIsNone(M.assign_region(25, -80, CONFIG))

    def test_npn_positive_only_and_no_deduced_absence(self):
        raw = [npn(), npn(phenophase_status=0, observation_id=2),
               npn(phenophase_status="-9999", observation_id=3),
               npn(phenophase_status=1, observation_date="2026-10-01", observation_id=4),
               npn(phenophase_status=1, observation_date="2026-12-01", observation_id=5),
               npn(phenophase_status=1, site_id=550, individual_id=18, observation_id=6)]
        selected = M.normalize_npn(raw, CONFIG, NOW)
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["phase"], "leaf-color")
        self.assertEqual(selected[0]["source"], "usa-npn")
        self.assertNotIn("lat", str(selected))
        self.assertNotIn("longitude", str(selected))

    def test_npn_ambiguous_adults_are_not_labelled_insects(self):
        self.assertEqual(M.normalize_npn([npn(kingdom="Animalia", common_name="gray fox",
                  phenophase_description="Adults")],CONFIG,NOW),[])
        rows=M.normalize_npn([npn(kingdom="Animalia", common_name="spring peeper",
                     phenophase_description="Adults", taxon_class="Amphibia")],CONFIG,NOW)
        self.assertEqual(rows, [])
        self.assertEqual(M.normalize_npn([npn(kingdom="Animalia", common_name="white-throated sparrow",
                     phenophase_description="Calls or song (birds)")],CONFIG,NOW)[0]["phase"],"bird-calls")

    def test_geo_obscured_and_private_inat_excluded_even_when_research_grade(self):
        cases = [
            {"geoprivacy":"obscured"}, {"taxon_geoprivacy":"obscured"},
            {"obscured":True}, {"coordinates_obscured":True},
            {"public_positional_accuracy":12000},
            {"quality_grade":"needs_id"}, {"captive":True},
            {"geojson":{"coordinates":[-100,35]}},
            {"observed_on":"2026-10-01"},
            {"observed_on":"2026-11-10"},
            {"annotations":[{"controlled_attribute_id":36,"controlled_value_id":38}]},
            {"user":{}}, {"taxon":{}},
        ]
        for mutate in cases:
            with self.subTest(mutate=mutate):
                self.assertFalse(M.normalize_inat([inat(**mutate)],"leaf-color",CONFIG,NOW))
        yes = M.normalize_inat([inat()], "leaf-color", CONFIG,NOW)
        self.assertEqual(len(yes),1)
        self.assertEqual(yes[0]["region"],"saginaw-bay")
        self.assertNotIn("coordinates", json.dumps(yes))

    def test_i_nat_adult_only_if_taxon_is_insect(self):
        adult=inat(taxon={"id":180,"preferred_common_name":"cabbage white",
                          "iconic_taxon_name":"Insecta"},
                   annotations=[{"controlled_attribute_id":1,"controlled_value_id":2}])
        self.assertEqual(M.normalize_inat([adult],"adult-insects",CONFIG,NOW)[0]["phase"],"adult-insects")
        adult["taxon"]["iconic_taxon_name"]="Aves"
        self.assertEqual(M.normalize_inat([adult],"adult-insects",CONFIG,NOW),[])

    def test_multi_site_vs_just_one_reporting_site(self):
        rows=[npn(site_id=1),npn(site_id=2,individual_id=3,observation_id=2),
              npn(site_id=2,individual_id=4,observation_id=3),
              npn(site_id=2,individual_id=4,observation_id=4)]
        result=M.build(CONFIG,rows,[],NOW)
        reg=next(x for x in result["regions"] if x["id"]=="saginaw-bay")
        self.assertEqual(reg["phases"][0]["reportingSites"],2)
        self.assertEqual(reg["phases"][0]["coverage"],"multiple-reporters-or-sites")
        self.assertEqual(reg["phases"][0]["sourceReports"]["usa-npn"],3)
        limited=M.build(CONFIG,[npn()],[],NOW)
        self.assertEqual(next(x for x in limited["regions"] if x["id"]=="saginaw-bay")["phases"][0]["coverage"],"limited-sample")
        self.assertFalse(any("observer:" in json.dumps(r) for r in result["regions"]))
        self.assertFalse(any("site:" in json.dumps(r) for r in result["regions"]))
        self.assertNotIn("individual_id",json.dumps(result))

    def test_site_scope_and_location_protection(self):
        result=M.build(CONFIG,[npn()],[],NOW)
        self.assertEqual(result["science"]["noSubmissionRequired"],True)
        self.assertTrue(all("lat" in x and "lon" in x for x in result["regions"]))
        self.assertEqual(result["regions"][4]["lat"],CONFIG["regions"][4]["lat"])
        self.assertFalse(any("550" in json.dumps(r) for r in result["regions"]))
        self.assertNotIn("43.61",json.dumps(result))
        self.assertNotIn("43.61",json.dumps(result))  # no raw site point; only predefined regional anchors

    def test_not_infer_statewide_absence_on_no_reports(self):
        result=M.build(CONFIG,[],[],NOW,source_health={"usa-npn":{"state":"ok"},
                    "inaturalist":{"state":"unavailable","missingRegions":["saginaw-bay/flowering"],"cappedQueries":0,
                                   "failedRequests":1}})
        self.assertEqual(result["regions"][4]["phases"],[])
        self.assertEqual(result["sourceStatus"]["iNaturalist"],"unavailable")
        self.assertEqual(result["regions"][4]["sampledReportCount"],0)

    def test_cross_year_earliest_old_date_excluded(self):
        winter=M.build(CONFIG,[npn(observation_date="2026-11-01")],[],dt.date(2027,1,7))
        self.assertTrue(all(not r["phases"] for r in winter["regions"]))

    def test_public_archive_is_evidence_scoped_after_automatic_refresh(self):
        archive=json.loads((ROOT/"data/michigan-phenophase-geography.json").read_text())
        self.assertEqual(archive["schema"],"michigan-phenophase-geography-v1")
        self.assertEqual(len(archive["regions"]),9)
        self.assertIn(archive["sourceStatus"]["usaNpn"],("pending","ok"))
        if archive["sourceStatus"]["usaNpn"]=="pending":
            self.assertFalse(any(r["phases"] for r in archive["regions"]))
        self.assertTrue(all(r["lat"]==CONFIG["regions"][i]["lat"]
                            and r["lon"]==CONFIG["regions"][i]["lon"]
                            for i,r in enumerate(archive["regions"])))
        self.assertTrue(all(p["coverage"] in ("multiple-reporters-or-sites","limited-sample")
                            for r in archive["regions"] for p in r["phases"]))
        for private_field in ("reviewer_id","site_id","individual_id","geojson","positional_accuracy","reporter"):
            self.assertNotIn('"'+private_field+'"',json.dumps(archive))

if __name__=="__main__":
    unittest.main()
