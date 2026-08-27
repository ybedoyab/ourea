"""Ourea geospatial, checkpoint and model validation."""
from __future__ import annotations

from pathlib import Path
import json

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "frontend" / "public" / "data"
DERIVED = ROOT / "data" / "derived"
MODEL_FILE = ROOT / "frontend" / "src" / "config" / "modelParameters.json"


def ok(message: str) -> None:
    print(f"[OK] {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def finite_series(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


buildings = gpd.read_file(DATA / "buildings.geojson")
cells = gpd.read_file(DATA / "planning_cells.geojson")
hazard = gpd.read_file(DATA / "hazard.geojson")
roads = gpd.read_file(DATA / "roads.geojson")
screening = gpd.read_file(DATA / "medellin_city_priority_screen.geojson")
summary = json.loads((DATA / "summary.json").read_text(encoding="utf-8"))
registry = json.loads(
    (DATA / "intervention_registry.json").read_text(encoding="utf-8")
)
evidence = json.loads(
    (DATA / "evidence_status.json").read_text(encoding="utf-8")
)
model = json.loads(MODEL_FILE.read_text(encoding="utf-8"))

require(
    len(buildings) == 1588,
    f"Expected 1588 detailed buildings, got {len(buildings)}",
)
require(buildings.geometry.notna().all(), "Building geometry is missing")
require(buildings.geometry.is_valid.all(), "Invalid building geometry")
require(buildings["objectid"].is_unique, "Building object IDs must be unique")
require(buildings["cell_id"].notna().all(), "Some buildings have no planning cell")
ok("1,588 unique valid detailed building geometries")

require(len(cells) == 49, f"Expected 49 planning cells, got {len(cells)}")
require(cells["cell_id"].is_unique, "Planning cell IDs must be unique")
known_cells = set(cells["cell_id"].astype(int))
require(
    set(buildings["cell_id"].astype(int)).issubset(known_cells),
    "A building references an unknown planning cell",
)
ok("49 unique planning cells and valid building-to-cell references")

for field in [
    "rwh_opportunity",
    "drainage_corridor_proxy",
    "restoration_opportunity",
]:
    values = finite_series(cells[field])
    require(values.notna().all(), f"{field} has non-numeric values")
    require(
        ((values >= 0) & (values <= 1)).all(),
        f"{field} must remain within [0,1]",
    )

for obsolete in [
    "rwh_suitability",
    "drainage_suitability",
    "restoration_suitability",
]:
    require(
        obsolete not in cells.columns,
        f"Obsolete V1 risk-weighted field remains: {obsolete}",
    )
ok("Intervention opportunity proxies are bounded and V1 double-counting fields are absent")

population = finite_series(buildings["population_proxy"]).fillna(0)
households = finite_series(buildings["households_proxy"]).fillna(0)
require((population >= 0).all(), "Negative building population proxy")
require((households >= 0).all(), "Negative building household proxy")
require(int(cells["buildings"].sum()) == summary["buildings"], "Cell building totals do not reconcile")
require(
    int(cells["high_hazard_buildings"].sum())
    == summary["high_hazard_buildings"],
    "Cell high-hazard totals do not reconcile",
)
require(
    int(cells["stratum1_buildings"].sum())
    == summary["stratum_1_buildings"],
    "Cell stratum-1 totals do not reconcile",
)
require(
    abs(
        float(cells["population_proxy"].sum())
        - float(summary["population_proxy"])
    )
    <= 1,
    "Cell population proxy does not reconcile",
)
require(
    abs(
        float(cells["households_proxy"].sum())
        - float(summary["households_proxy"])
    )
    <= 1,
    "Cell household proxy does not reconcile",
)
ok("Detailed exposure aggregates reconcile")

require(len(hazard) > 0, "Hazard layer is empty")
require(len(roads) > 0, "Road/access layer is empty")
require(hazard.geometry.notna().all(), "Hazard geometry missing")
require(roads.geometry.notna().all(), "Road geometry missing")
ok("Hazard and access layers are present")

require(len(screening) == 271, f"Expected 271 city polygons, got {len(screening)}")
population_2026 = finite_series(screening["population_2026"])
matched = screening[population_2026.notna()].copy()
require(
    len(matched) == 248,
    f"Expected 248 safely matched population barrios, got {len(matched)}",
)

for field in [
    "priority_exposure",
    "priority_balanced",
    "priority_equity",
    "exposure_component",
    "vulnerability_component",
]:
    values = finite_series(matched[field])
    require(values.notna().all(), f"{field} missing for matched barrios")
    require(
        ((values >= 0) & (values <= 1)).all(),
        f"{field} outside [0,1]",
    )

for rank_field in [
    "rank_exposure",
    "rank_balanced",
    "rank_equity",
]:
    ranks = finite_series(matched[rank_field])
    require(ranks.notna().all(), f"{rank_field} missing")
    require((ranks >= 1).all(), f"{rank_field} contains rank < 1")
    require(
        (ranks <= len(matched)).all(),
        f"{rank_field} exceeds matched-barrio count",
    )

llanaditas = screening[
    screening.BARRIO.str.contains("LLANADITAS", case=False, na=False)
]
require(len(llanaditas) == 1, "Could not uniquely resolve Llanaditas No.2")
ll = llanaditas.iloc[0]
require(int(ll.population_2026) == 10416, "Unexpected Llanaditas 2026 population projection")
require(int(ll.rank_hazard_only) == 9, "Unexpected Llanaditas hazard-only rank")
require(int(ll.rank_exposure) == 7, "Unexpected Llanaditas exposure rank")
require(int(ll.rank_balanced) == 13, "Unexpected Llanaditas balanced rank")
require(int(ll.rank_equity) == 22, "Unexpected Llanaditas equity rank")
ok("City screen: 248 population-matched barrios; Llanaditas ranks and projection are stable")

source_meta = json.loads(
    (DERIVED / "city_screening_source_metadata.json").read_text(encoding="utf-8")
)
require(
    source_meta["population_projection"]["urban_barrio_records"] == 249,
    "Official population workbook urban barrio count changed",
)
require(
    source_meta["population_projection"]["matched_to_current_polygon_export"] == 248,
    "Population/polygon safe-match count changed",
)
ok("City-screening source metadata records official 249-to-248 safe-match provenance")

require(
    registry["optimizer"]["budget_unit"] == "planning credit, NOT COP",
    "Planning-credit guardrail missing",
)
require(
    registry["parameter_source"]
    == "frontend/src/config/modelParameters.json",
    "Evidence registry does not point to single numerical source",
)
require(
    "development_parameters"
    not in registry["interventions"]["rainwater_harvesting"],
    "Evidence registry duplicates numerical parameters",
)

require(evidence["schema"] == "ourea-evidence-registry", "Evidence registry schema changed")
require(int(evidence["schema_version"]) == 1, "Evidence registry schema_version changed")
guardrails = json.loads(
    (ROOT / "frontend" / "src" / "config" / "scientificGuardrails.json").read_text(encoding="utf-8")
)["items"]
evidence_ids = {item["id"] for item in evidence["layers"]}
for required_id in {
    "terrain",
    "hazard",
    "buildings",
    "population",
    "access",
    "climate",
    "intervention_effects",
    "cost",
    "city_population_2026",
    "city_imcv_2023",
    "city_priority_screen",
}:
    require(
        required_id in evidence_ids,
        f"Missing evidence-status entry: {required_id}",
    )
require(
    any("not landslide probability" in item for item in guardrails),
    "Landslide-probability guardrail missing",
)
require(
    any("not COP" in item for item in guardrails),
    "Planning-credit/COP guardrail missing",
)
require(
    any("not a prediction of social acceptance" in item for item in guardrails),
    "Community-evidence guardrail missing",
)
ok("Evidence/provenance and DRY guardrails pass")

stress = model["stress"]
require(
    np.isclose(
        float(stress["spatialWeights"]["hazard"])
        + float(stress["spatialWeights"]["slope"]),
        1.0,
    ),
    "Spatial stress weights must sum to 1",
)
require(
    np.isclose(
        float(stress["climateWeights"]["base"])
        + float(stress["climateWeights"]["rain"])
        + float(stress["climateWeights"]["antecedentWetness"]),
        1.0,
    ),
    "Climate weights must sum to 1",
)
for name, config in model["interventions"].items():
    low, high = map(float, config["effectRange"])
    require(0 <= low <= high <= 1, f"Invalid effect range for {name}")
    require(float(config["costCredits"]) > 0, f"Invalid planning-credit cost for {name}")

profiles = model["optimizer"]["objectiveProfiles"]
require(
    set(profiles) == {"balanced", "equity", "access", "low_regret"},
    "Unexpected objective profile set",
)
for name, profile in profiles.items():
    require(float(profile["equityWeight"]) >= 0, f"Negative equity weight: {name}")
    require(float(profile["accessWeight"]) >= 0, f"Negative access weight: {name}")
    require(float(profile["downsidePenalty"]) >= 0, f"Negative downside penalty: {name}")

pareto_grid = model["optimizer"]["paretoGrid"]
require(len(pareto_grid["equityWeights"]) >= 2, "Pareto equity grid too small")
require(len(pareto_grid["accessWeights"]) >= 2, "Pareto access grid too small")
require(int(pareto_grid["optimizerScenarioSamples"]) > 0, "Pareto optimizer samples invalid")
require(int(pareto_grid["monteCarloRuns"]) > 0, "Pareto MC runs invalid")
ok("Stress/intervention/profile/Pareto configuration invariants pass")

state = int(model["scenarioUncertainty"]["baseSeed"])
uint32_mask = 0xFFFFFFFF
draws = []
for _ in range(6):
    state = (1664525 * state + 1013904223) & uint32_mask
    draws.append(state / 4294967296.0)

rain_low, rain_high = map(
    float,
    model["scenarioUncertainty"]["rainMultiplier"],
)
wet_half = float(
    model["scenarioUncertainty"]["antecedentWetnessHalfRange"]
)
fixture_rain = 95 * (rain_low + (rain_high - rain_low) * draws[0])
fixture_wet = np.clip(
    0.45 + (draws[1] * 2 - 1) * wet_half,
    0,
    1,
)
require(
    abs(fixture_rain - 91.92791593084112) < 1e-12,
    "Cross-language rainfall RNG fixture drifted",
)
require(
    abs(fixture_wet - 0.5115487693995238) < 1e-12,
    "Cross-language wetness RNG fixture drifted",
)
ok("Cross-language seeded uncertainty fixture is stable")

replay_contract = json.loads(
    (DATA / "replay_contract.json").read_text(encoding="utf-8")
)["historical_replay"]
required_rainfall = {
    "rain_increment_mm",
    "r1h_mm",
    "r6h_mm",
    "r24h_mm",
    "r3d_mm",
    "r7d_mm",
    "r15d_mm",
}
require(
    required_rainfall.issubset(
        set(replay_contract["required_features"])
    ),
    "Replay contract missing rainfall features",
)
require(
    not (DATA / "replay_timeline.json").exists(),
    "Synthetic/test SIATA replay timeline found in deliverable",
)
ok("SIATA replay contract ready; no synthetic timeline shipped")

browser = json.loads(
    (DATA / "optimizer_checkpoint.json").read_text(encoding="utf-8")
)
require(
    browser["spentCredits"] <= browser["budgetCredits"],
    "Browser checkpoint overspends",
)
require(
    browser["optimizerDiagnostics"]["profile"]["id"] == "balanced",
    "Default browser checkpoint is not Balanced policy",
)
require(
    browser["optimizerDiagnostics"]["candidateCount"] > 0,
    "No browser optimizer candidates",
)
require(
    browser["benefitProxyMonteCarlo"]["runs"]
    == int(model["optimizer"]["checkpointMonteCarloRuns"]),
    "Browser checkpoint MC run count diverged from config",
)
bp = browser["benefitProxyMonteCarlo"]
require(bp["p10"] <= bp["median"] <= bp["p90"], "Browser checkpoint quantiles unordered")
ok("Default Balanced browser checkpoint passes")

frontier = json.loads(
    (DERIVED / "browser_budget_frontier.json").read_text(encoding="utf-8")
)
expected_budgets = list(model["optimizer"]["frontierBudgets"])
require(
    [item["budgetCredits"] for item in frontier] == expected_budgets,
    "Browser budget frontier budgets diverged from config",
)
for item in frontier:
    require(item["profileId"] == "balanced", "Default frontier is not Balanced")
    require(item["spentCredits"] <= item["budgetCredits"], "Frontier overspends")
    require(item["p10"] <= item["median"] <= item["p90"], "Frontier quantiles unordered")
    require(0 <= item["downsideRetention"] <= 1, "Frontier downside retention invalid")
ok("Balanced budget robustness frontier passes")

stability = json.loads(
    (DERIVED / "browser_selection_stability.json").read_text(encoding="utf-8")
)
require(stability["profileId"] == "balanced", "Default stability is not Balanced")
require(
    stability["runCount"]
    == int(model["optimizer"]["stabilityRuns"]),
    "Stability run count diverged from config",
)
require(
    stability["scenarioSamplesPerOptimization"]
    == int(model["optimizer"]["stabilityScenarioSamples"]),
    "Stability scenario samples diverged from config",
)
for item in stability["projects"]:
    require(
        0 < item["selections"] <= stability["runCount"],
        "Invalid stability selection count",
    )
    require(0 < item["frequency"] <= 1, "Invalid stability frequency")
ok("Balanced selection-stability checkpoint passes")

alternatives = json.loads(
    (DERIVED / "robust_policy_alternatives.json").read_text(encoding="utf-8")
)
require(len(alternatives) == 4, "Expected four robust policy alternatives")
require(
    {item["profileId"] for item in alternatives}
    == {"balanced", "equity", "access", "low_regret"},
    "Alternative profile set mismatch",
)
plan_keys = {}
for item in alternatives:
    require(item["spentCredits"] <= browser["budgetCredits"], "Alternative overspends")
    proxy = item["benefitProxy"]
    require(proxy["p10"] <= proxy["median"] <= proxy["p90"], "Alternative quantiles unordered")
    require(0 <= proxy["downsideRetention"] <= 1, "Alternative retention invalid")
    plan_keys[item["profileId"]] = tuple(
        sorted(
            (int(project["cell_id"]), project["type"])
            for project in item["projects"]
        )
    )
require(
    plan_keys["low_regret"] != plan_keys["balanced"],
    "Low-regret policy collapsed to the Balanced plan; expected materially distinct risk-averse selection",
)
ok("Four policy alternatives are feasible and materially differentiated")

consensus = json.loads(
    (DERIVED / "policy_consensus.json").read_text(encoding="utf-8")
)
require(len(consensus) > 0, "Policy-consensus artifact is empty")
for item in consensus:
    require(
        1 <= item["selectedByPolicies"] <= len(alternatives),
        "Invalid policy-consensus selection count",
    )
    require(0 < item["policyShare"] <= 1, "Invalid policy-consensus share")
    require(
        item["consensusAllNamedPolicies"]
        == (item["selectedByPolicies"] == len(alternatives)),
        "Policy-consensus boolean/count mismatch",
    )
require(
    sum(1 for item in consensus if item["consensusAllNamedPolicies"]) >= 1,
    "Expected at least one project shared by all named policies",
)
ok("Named-policy consensus artifact passes")

pareto = json.loads(
    (DERIVED / "sampled_pareto.json").read_text(encoding="utf-8")
)
expected_samples = (
    len(pareto_grid["equityWeights"])
    * len(pareto_grid["accessWeights"])
)
require(
    pareto["sampledProfiles"] == expected_samples,
    "Pareto sampled-profile count diverged from config",
)
require(
    0 < len(pareto["frontier"]) <= pareto["uniquePortfolios"],
    "Invalid sampled Pareto frontier size",
)
for item in pareto["frontier"]:
    require(item["spentCredits"] <= browser["budgetCredits"], "Pareto point overspends")
    require(
        item["robustP10"] <= item["robustMedian"] <= item["robustP90"],
        "Pareto uncertainty quantiles unordered",
    )
    require(item["equityBenefit"] >= 0, "Negative Pareto equity proxy")
    require(item["accessBenefit"] >= 0, "Negative Pareto access proxy")
ok("Sampled non-dominated trade-off artifact passes")

milp = json.loads(
    (DERIVED / "milp_checkpoint.json").read_text(encoding="utf-8")
)
require(milp["solver_success"], "Formal MILP checkpoint failed")
require(milp["policy_profile"] == "balanced", "Formal MILP is not Balanced profile")
require(
    milp["nonlinear_portfolio_re_evaluation"]["runs"]
    == int(model["optimizer"]["checkpointMonteCarloRuns"]),
    "MILP nonlinear reevaluation run count diverged",
)
mp = milp["nonlinear_portfolio_re_evaluation"]
require(mp["p10"] <= mp["median"] <= mp["p90"], "MILP quantiles unordered")
ok("Formal Balanced MILP + nonlinear reevaluation pass")

formal_policies = json.loads(
    (DERIVED / "milp_policy_alternatives.json").read_text(encoding="utf-8")
)
require(
    {item["profile_id"] for item in formal_policies}
    == {"balanced", "equity", "access", "low_regret"},
    "Formal policy cross-check profile set mismatch",
)
for item in formal_policies:
    require(item["solver_success"], f"Formal policy solve failed: {item['profile_id']}")
    require(
        item["spent_credits"] <= item["budget_credits"],
        f"Formal policy overspends: {item['profile_id']}",
    )
    q = item["nonlinear_re_evaluation"]
    require(
        q["runs"] == int(model["optimizer"]["checkpointMonteCarloRuns"]),
        f"Formal policy reevaluation count diverged: {item['profile_id']}",
    )
    require(
        q["p10"] <= q["median"] <= q["p90"],
        f"Formal policy quantiles unordered: {item['profile_id']}",
    )
ok("All four named policy profiles receive a formal MILP structural cross-check")

community_template = json.loads(
    (DATA / "community_evidence.template.json").read_text(encoding="utf-8")
)
require(community_template["template"] is True, "Community template must be marked template=true")
require(
    not (DATA / "community_evidence.json").exists(),
    "Observed community_evidence.json must not ship invented social data",
)
ok("Community evidence template is present and no fabricated community file is shipped")

print("\nAll Ourea validation checks passed.")
