# OUREA Competition V4 — QA report

**QA date:** 2026-08-18  
**Artifact:** Competition Build V4 / package 0.4.0  
**Scientific status:** spatial/evidence architecture assembled; SIATA dynamic calibration and final local effect/cost calibration remain pending.

## Overall status

Every V4 check that can run in this container is currently **PASS**.

The only unexecuted release gate is a fresh **Vite production bundle**, because this environment cannot resolve `registry.npmjs.org` (`EAI_AGAIN`). The user is performing that final local QA.

## PASS — Node domain/service tests

Command:

```bash
cd frontend
node --test tests/*.test.js
```

Result:
- **30/30 passed**;
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
- decision package v2;
- selection stability;
- budget frontier;
- sampled non-dominated trade-offs;
- named-policy consensus;
- optional replay loading and required-data failures.

## PASS — V4 frontend data validation

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
- V4 city priority scores/ranks are bounded/consistent;
- evidence/replay/model configuration passes.

Llanaditas V4 invariant:
- projected 2026 population: **10,416**;
- hazard-only rank **#9**;
- exposure rank **#7**;
- balanced rank **#13**;
- equity rank **#22**.

## PASS — source / DRY / reproducibility validation

- **33 JS/JSX source files** inspected;
- all local imports resolve;
- no unseeded `Math.random` in the domain model;
- no obsolete V1 risk-weighted fields;
- no frontend reference to the obsolete V3 hazard-only city screen;
- direct dependencies pinned;
- Node engine declared;
- V4 policy weights are not duplicated in domain source;
- numerical configuration derives from `modelParameters.json`.

## PASS — JS/JSX syntax parse

TypeScript 5.8.3 transpile/parse check:
- **33 files**;
- **0 syntax errors**.

This is not a substitute for the unavailable production Vite bundle.

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

Some formal profiles can collapse to the same project set under linearized coefficients. V4 preserves that result rather than manufacturing differentiation.

## PASS — full Python artifact validator

`python scripts/validate_project.py`

Final result:

`All OUREA Competition V4 validation checks passed.`

It checks city data, detailed GIS, evidence, browser checkpoints, policy alternatives, policy consensus, trade-offs, SIATA contract and formal optimization artifacts.

## NOT EXECUTED — fresh Vite production bundle

Current environment check:

```text
npm view react version
→ EAI_AGAIN getaddrinfo registry.npmjs.org
```

Therefore this artifact does **not** claim a fresh `npm run build` PASS in the container.

Final local release gate:

```bash
cd frontend
npm install
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
`FINAL_QA_USER_CHECKLIST.md`
