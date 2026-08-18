# OUREA Competition V4 — scripts

## `validate_project.py`

Full artifact validator:
- 1,588 detailed buildings / 49 cells;
- intervention opportunity bounds;
- V4 city screen and 249→248 population-match provenance;
- evidence/model guardrails;
- browser checkpoint/frontier/stability;
- four named robust alternatives;
- sampled non-dominated trade-offs;
- formal Balanced MILP;
- formal all-policy MILP cross-checks;
- no synthetic SIATA replay.

## `optimizer_milp.py`

Independent formal binary portfolio model.

Outputs:
- `data/derived/milp_checkpoint.json`
- `data/derived/portfolio_frontier_milp.csv`
- `data/derived/milp_plan_10credits.geojson`
- `data/derived/milp_policy_alternatives_v4.json`

Every selected plan receives nonlinear post-selection reevaluation.

## `siata_ingest.py`

Raw rainfall adapter:
- delimiter/column handling;
- explicit increment/cumulative modes;
- missing-as-missing behavior;
- rolling coverage;
- 1h/6h/24h/3d/7d/15d features;
- QA report;
- optional replay JSON.

## `siata_event_diagnostics.py`

Consumes actual SIATA feature output and summarizes rainfall around a **caller-supplied verified event timestamp**.

It intentionally does not calibrate a landslide predictor.

## `test_siata_ingest.py`

5 rainfall-ingestion/data-quality regression tests.

## `test_siata_event_diagnostics.py`

3 historical-event diagnostic regression tests.

## `rebuild_buildings.py`

Narrow helper for rebuilding the detailed building asset from an already fully enriched source.

It does not pretend to reproduce the whole GIS pipeline.

## `make_manifest.py`

Creates:
- `MANIFEST.json`
- `SHA256SUMS.txt`

The V4 manifest records city-screen, policy-alternative, sampled trade-off and formal cross-check metadata.

## `build_city_screen_v4.py`

Deterministically rebuilds the enriched city screen from:
- the preserved hazard-only barrio baseline;
- the official 2018–2030 population-projection workbook;
- the official 2023 IMCV workbook.

It uses an explicit audited alias map rather than unconstrained fuzzy matching and deliberately leaves the ambiguous Nueva Villa de La Iguaná record unmatched.
