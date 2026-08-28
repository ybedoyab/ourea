"""Reproducible USD cost-context builder."""
from __future__ import annotations

import sys
import unittest
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_cost_context import (  # noqa: E402
    OUTPUT,
    build,
    dump,
    factors_after,
    inflate,
    median,
)


class CostContextTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context = build()
        cls.rwh = cls.context["interventions"]["rwh"]
        cls.drainage = cls.context["interventions"]["drainage"]
        cls.restoration = cls.context["interventions"]["restoration"]

    def test_fx_and_price_date_are_versioned(self):
        self.assertEqual(self.context["fx"]["date"], "2026-08-28")
        self.assertEqual(self.context["fx"]["cop_per_usd"], 3144.28)
        self.assertEqual(self.context["price_date"], "2026-08-28")
        self.assertIn("banrep.gov.co", self.context["fx"]["url"])

    def test_rwh_inflation_and_fx(self):
        ceiling = Decimal("2119450")
        factors = [Decimal("1.052"), Decimal("1.051"), Decimal("1.0494")]
        cop_2026 = inflate(ceiling, factors)
        usd = cop_2026 / Decimal("3144.28")
        self.assertAlmostEqual(float(cop_2026), 2459137, delta=1)
        self.assertAlmostEqual(self.rwh["normalized_cop_2026"], float(cop_2026), places=2)
        self.assertAlmostEqual(self.rwh["anchor_usd"], float(usd), places=2)
        self.assertAlmostEqual(self.rwh["anchor_usd"], 782, delta=1)
        self.assertEqual(self.rwh["usd_per_system"]["low"], 550)
        self.assertEqual(self.rwh["usd_per_system"]["base"], 780)
        self.assertEqual(self.rwh["usd_per_system"]["high"], 1200)

    def test_low_base_high_ordering(self):
        for family in (
            self.rwh["usd_per_system"],
            self.drainage["usd_per_reported_m"],
            self.restoration["usd_per_package"],
        ):
            self.assertLess(family["low"], family["base"])
            self.assertLess(family["base"], family["high"])

    def test_drainage_converts_each_record_independently(self):
        records = self.drainage["records"]
        self.assertEqual(len(records), 6)
        usd = [item["usd_per_reported_m"] for item in records]
        self.assertEqual(self.drainage["usd_per_reported_m"]["low"], min(usd))
        self.assertEqual(self.drainage["usd_per_reported_m"]["high"], max(usd))
        self.assertAlmostEqual(self.drainage["usd_per_reported_m"]["low"], 7800, delta=50)
        self.assertAlmostEqual(self.drainage["usd_per_reported_m"]["base"], 11300, delta=50)
        self.assertAlmostEqual(self.drainage["usd_per_reported_m"]["high"], 15800, delta=50)
        self.assertEqual(self.drainage["length_m"]["low"], 40)
        self.assertEqual(self.drainage["length_m"]["base"], 60)
        self.assertEqual(self.drainage["length_m"]["high"], 80)
        for record in records:
            blob = f"{record['comparability_warning']} {record.get('model_use', '')}".lower()
            self.assertTrue("unit" in blob or "scopes differ" in blob)
            self.assertEqual(record["original_currency"], "COP")
            self.assertTrue(record["url"])

    def test_restoration_anchor_near_196k(self):
        self.assertAlmostEqual(self.restoration["anchor_usd"], 196000, delta=1500)
        self.assertEqual(self.restoration["usd_per_package"]["low"], 140000)
        self.assertEqual(self.restoration["usd_per_package"]["base"], 196000)
        self.assertEqual(self.restoration["usd_per_package"]["high"], 295000)
        self.assertEqual(self.restoration["evidence_tier"], "low")

    def test_sources_carry_required_fields(self):
        required = {
            "id",
            "source_date",
            "location",
            "quantity_basis",
            "inflation_method",
            "fx_method",
            "inclusions",
            "exclusions",
            "evidence_tier",
            "comparability_warning",
            "url",
            "access_date",
        }
        self.assertGreaterEqual(len(self.context["sources"]), 8)
        for source in self.context["sources"]:
            missing = required - set(source)
            self.assertFalse(missing, f"{source.get('id')} missing {missing}")
            self.assertTrue(str(source["url"]).startswith("http"))

    def test_median_helper(self):
        self.assertEqual(median([Decimal(1), Decimal(3), Decimal(2)]), Decimal(2))
        self.assertEqual(
            median([Decimal(1), Decimal(2), Decimal(3), Decimal(4)]),
            Decimal("2.5"),
        )

    def test_cpi_factor_selection(self):
        factors = self.context["cpi"]["factors"]
        after_2023 = factors_after(factors, 2023)
        self.assertEqual([float(item) for item in after_2023], [1.052, 1.051, 1.0494])
        after_2019 = factors_after(factors, 2019)
        self.assertEqual(len(after_2019), 7)

    def test_committed_json_is_reproducible(self):
        committed = OUTPUT.read_text(encoding="utf-8").replace("\r\n", "\n")
        self.assertEqual(committed, dump(self.context))
