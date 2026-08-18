# OUREA changelog

## Brand / judge-ready UI — 2026-08-18

- Rebranded the product from LaderaLab to **OUREA** (Optimized Urban Resilience through Equity & Adaptation).
- Added inline SVG mark, design tokens, numbered journey, intervention cards, P10–P90 interval, grouped evidence and SIATA “calibration bridge” framing.
- Decision export schema is now `ourea-decision-package/v2` (`ourea_decision_package_v4.json`).
- Numerical model, optimizer, uncertainty and evidence meanings were not changed.

## Competition V4 — 2026-08-18

### City scale
- Replaced V3 hazard-only city screen with official hazard + official 2026 projected population + official 2023 IMCV/AMPI.
- Parsed 249 official urban barrio population records.
- Safely matched 248/249 to the current city polygon export.
- Deliberately left one ambiguous record unmatched rather than forcing geometry.
- Added Exposure / Balanced / Equity city lenses.
- Added city-lens map coloring, ranking cards and detailed barrio inspection.
- Llanaditas now has transparent multi-lens ranks (#7 exposure, #13 balanced, #22 equity) rather than a single hazard-only narrative.

### Decision policies
- Replaced one implicit objective policy with four named profiles:
  - Balanced;
  - Equity-first;
  - Access-first;
  - Low-regret.
- Kept every weight in the single model parameter source.
- Added highest-P10 recommendation label without claiming universal optimality.

### Multi-objective decision intelligence
- Added alternative robust portfolio generation.
- Added named-policy consensus analysis (projects shared across all four policy lenses).
- Added deterministic equity-benefit and access-benefit proxies.
- Added sampled 3×3 equity/access policy grid.
- Added non-dominated trade-off extraction.
- UI labels it “sampled non-dominated trade-offs”, not exhaustive Pareto frontier.

### Explainability
- Added project-level opportunity/equity/access chips.
- Added expandable “Why here?” with mean/P10 marginal benefit, robust value and value/credit.
- Added selection-stability status to project rows.
- Added explicit statement of assumptions that can change recommendations.

### Robustness
- Frontier and stability now follow the active policy profile.
- Active UI Monte Carlo now uses the same comparison seed as alternative cards to avoid confusing cross-view discrepancies.
- Low-regret policy strengthened to create a genuinely risk-averse lower-tail portfolio rather than duplicate another policy lens.

### Formal optimization
- Updated Python MILP to consume the V4 Balanced objective profile.
- Added formal all-policy structural cross-checks.
- Each formal selected plan receives nonlinear 500-future reevaluation.

### SIATA readiness
- Added `siata_event_diagnostics.py`.
- Added regression tests for event-nearest observation, missing accumulations and required fields.
- Calibration plan explicitly requires verified event timestamp before hindcast claims.

### Cost evidence
- Added official 2023 Santa Elena household RWH procurement budget ceiling:
  ~COP 2.119M per installed 1,000 L system as a local evidence anchor.
- Explicitly kept it out of the optimizer because it is a procurement ceiling in a different context, not a transferable Comuna 8 unit price.

### Evidence / governance
- Added city population projection, official IMCV and derived city-screen statuses to the evidence registry.
- Expanded decision export to schema v2 with city lens, policy alternatives, sampled trade-offs and guardrails.

### QA
- Expanded Node domain/service test suite to 30 tests.
- Expanded SIATA Python regression suite to 8 tests (ingestion + event diagnostics).
- V4 city data validation covers 248 population-matched barrios.
- Source validation prevents stale V3 city-screen asset use and duplicated policy-weight constants.
- Formal V4 Python validation covers city screen, alternatives, trade-offs, browser checkpoints and MILP.

## V3 — 2026-08-18

V3 introduced:
- modular frontend/domain/services architecture;
- true 3D terrain;
- common-random-number Monte Carlo;
- robust budget frontier;
- selection stability;
- evidence/provenance labels;
- SIATA ingestion QA;
- formal MILP cross-check;
- competition documentation/guardrails.
