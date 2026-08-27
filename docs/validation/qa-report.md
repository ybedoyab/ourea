# Ourea — QA report

**QA date:** 2026-08-27  
**Artifact:** Ourea / package 0.4.0  
**Scientific status:** spatial/evidence architecture assembled; SIATA dynamic calibration and final local effect/cost calibration remain pending.

## Overall status

Local revalidation on 2026-08-27: Node tests (40/40), data validation, source validation, Vite production build, SIATA tests (8/8), checkpoint regeneration, MILP, full geospatial validation and manifest regeneration **PASS**.

MapLibre dominates the production JavaScript bundle (~1.24 MB minified). That warning is accepted; a fragile extra split is not worth the maintenance cost.

## PASS — Node domain/service tests

Command:

```bash
cd frontend
node --test tests/*.test.js
```

Result:
- **40/40 passed**;
- 0 failed;
- 0 skipped.

Coverage includes:
- climate/stress monotonicity;
- intervention maturity/stacking;
- RWH volume caps and duplicate protection;
- seeded climate/effect uncertainty;
- project-order-invariant common-random-number Monte Carlo;
- budget/duplicate/max-project constraints;
- profile-aware robust optimizer;
- four robust policy alternatives;
- decision package (`ourea-decision-package`, schema_version 1) including community safeguards;
- community evidence categories, absent-file handling and no silent optimizer change;
- selection stability;
- budget frontier;
- sampled non-dominated trade-offs;
- named-policy consensus;
- optional replay loading and required-data failures.

## PASS — Ourea frontend data validation

Validated:
- 1,588 detailed buildings;
- 49 planning cells;
- 271 city polygons;
- **248 safely population-matched barrios** out of 249 official urban population records;
- 54 terrain tiles;
- unique IDs and valid building→cell links;
- detailed population/household/hazard/stratum aggregates reconcile;
- intervention opportunity fields remain bounded in `[0,1]`;
- obsolete V1 risk-weighted suitability fields remain absent;
- Ourea city priority scores/ranks are bounded/consistent;
- evidence/replay/model configuration passes.

Llanaditas Ourea invariant:
- projected 2026 population: **10,416**;
- hazard-only rank **#9**;
- exposure rank **#7**;
- balanced rank **#13**;
- equity rank **#22**.

## PASS — source / DRY / reproducibility validation

- **45 JS/JSX source files** inspected;
- all local imports resolve;
- no unseeded `Math.random` in the domain model;
- no obsolete V1 risk-weighted fields;
- no frontend reference to the obsolete V3 hazard-only city screen;
- direct dependencies pinned;
- Node engine declared;
- Ourea policy weights are not duplicated in domain source;
- numerical configuration derives from `modelParameters.json`.

## PASS — JS/JSX syntax parse

JS/JSX parse is covered by Node tests and the Vite production build. Current source validation inspects **45** application files.

## PASS — Python compilation

```bash
python -m compileall -q scripts
```

All project scripts compile.

## PASS — SIATA regression tests

```bash
cd scripts
python -m unittest -v test_siata_ingest.py test_siata_event_diagnostics.py
```

Result:
- **8/8 passed**.

Tested behavior includes:
- missing rainfall remains missing;
- complete rolling windows accumulate correctly;
- cumulative-gauge reset handling;
- auto-detection / QA report;
- missing accumulated rainfall serializes as null;
- event-nearest observation logic;
- missing event accumulations are not invented;
- malformed event inputs fail visibly.

## PASS — browser Balanced checkpoint

Default development scenario:
- rain: 95 mm hypothetical;
- antecedent wetness: 45%;
- planning year: 1;
- budget: 10 planning credits.

Optimizer:
- 125 eligible candidates;
- 80 optimizer scenarios;
- 6 selected projects;
- spends 10/10 credits.

500-future checkpoint:
- P10 **64.2711**;
- median **79.8448**;
- P90 **93.9914**;
- mean **79.3470**.

These are development benefit proxies.

## PASS — four named robust policy alternatives

Each policy is budget-feasible and uses the same 220 comparison futures:

- **Balanced** — 10 cr, 6 projects, P10 64.54, median 80.67
- **Equity-first** — 10 cr, 6 projects, P10 63.03, median 80.32
- **Access-first** — 10 cr, 6 projects, P10 65.63, median 78.82
- **Low-regret** — 10 cr, 4 projects, P10 66.33, median 81.90

Current lower-tail leader:
**Low-regret**.

The UI calls this `highest P10`, not universal optimality.

## PASS — named-policy consensus

Projects selected by every named policy profile:

- cell 35 — drainage (4/4 policies)
- cell 35 — rwh (4/4 policies)

The artifact also records partial membership for policy-sensitive projects.

## PASS — budget robustness frontier

Balanced default frontier includes configured budgets:

`4, 8, 12, 16, 20` planning credits.

Every point:
- stays within budget;
- has P10 ≤ median ≤ P90;
- has downside retention in `[0,1]`;
- uses common comparison futures.

## PASS — selection stability

Balanced default stability:
- 12 independent uncertainty resamples;
- 60 optimizer scenarios per resample.

Frequencies are bounded and reproducible. They are explicitly labeled as **decision stability**, not probability of true optimality.

## PASS — sampled multi-objective trade-offs

Current checkpoint:
- 9 sampled equity/access policy settings;
- 4 unique portfolios;
- 4 non-dominated portfolios.

The UI and export explicitly state that this is a **sampled non-dominated set**, not an exhaustive mathematical Pareto frontier.

## PASS — formal MILP / nonlinear reevaluation

Balanced formal checkpoint:
- solver success: `true`;
- 10 planning credits;
- 4 projects;
- nonlinear reevaluation: 500 futures;
- P10 **64.4507**;
- median **80.7083**;
- P90 **96.5977**.

Formal named-policy cross-checks:
- balanced: solver=true, 10 cr, P10 64.45, median 80.71
- equity: solver=true, 10 cr, P10 64.45, median 80.71
- access: solver=true, 10 cr, P10 63.75, median 79.90
- low_regret: solver=true, 10 cr, P10 64.45, median 80.71

Some formal profiles can collapse to the same project set under linearized coefficients. Ourea preserves that result rather than manufacturing differentiation.

## PASS — full Python artifact validator

`python scripts/validate_project.py`

Final result:

`All Ourea validation checks passed.`

It checks city data, detailed GIS, evidence, browser checkpoints, policy alternatives, policy consensus, trade-offs, SIATA contract and formal optimization artifacts.

## PASS — fresh Vite production build

`npm run build` succeeded locally on 2026-08-27.

The reporter warns that some chunks exceed 500 kB after minification. MapLibre accounts for most of that payload. Ourea documents the warning rather than adding an unmaintainable extra split.

Final local release gate:

```bash
cd frontend
npm ci
npm test
npm run build
npm run dev
```

The supplied launch scripts fail fast in that order.

## Known scientific limitations intentionally retained

- dynamic Climate Stress is not SIATA-calibrated yet;
- intervention effects are development priors;
- planning credits are not COP;
- city hazard-exposure assumes within-barrio uniform population;
- IMCV city-screen component is comuna-level;
- detailed population is a planning proxy;
- access benefit is not traffic/evacuation performance;
- benefit proxies are not people saved or avoided losses;
- policy weights require stakeholder co-design;
- sampled non-dominated set is not exhaustive Pareto optimization.

## Final browser QA

See:
`docs/validation/final-user-checklist.md`
