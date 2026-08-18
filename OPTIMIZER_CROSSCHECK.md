# OUREA Competition V4 — optimizer cross-check

This is a **software/model consistency artifact**, not real-world validation of intervention effectiveness.

## Default development scenario

- hypothetical storm depth: 95 mm
- antecedent wetness: 45%
- planning year: 1
- budget: 10 planning credits

## Interactive robust policy options

All named options use the same 220 comparison futures in the current V4 configuration.

| Policy | Credits | Projects | P10 | Median | Equity proxy | Access proxy |
|---|---:|---:|---:|---:|---:|---:|
| Balanced | 10 | 6 | 64.54 | 80.67 | 78.59 | 51.42 |
| Equity-first | 10 | 6 | 63.03 | 80.32 | 79.09 | 51.65 |
| Access-first | 10 | 6 | 65.63 | 78.82 | 79.38 | 57.31 |
| Low-regret | 10 | 4 | 66.33 | 81.90 | 80.95 | 56.61 |

Current lower-tail leader: **Low-regret**.

This means highest P10 in the current development ensemble, **not universal optimality**.

## Policy consensus

Projects selected by all four named policy lenses:
- cell 35 — drainage (4/4 named profiles)
- cell 35 — rwh (4/4 named profiles)

Other projects appear in only some profiles, which is useful evidence of objective sensitivity.

## Default Balanced browser checkpoint

Selected projects:
- cell 35 — rwh
- cell 1 — rwh
- cell 35 — drainage
- cell 2 — drainage
- cell 29 — rwh
- cell 28 — rwh

500-future checkpoint:
- P10: 64.2711
- median: 79.8448
- P90: 93.9914

## Formal Balanced MILP cross-check

Selected projects:
- cell 1 — drainage
- cell 2 — drainage
- cell 35 — rwh
- cell 35 — drainage

Nonlinear post-selection reevaluation:
- P10: 64.4507
- median: 80.7083
- P90: 96.5977

The browser and MILP need not select identical plans:
- browser = sequential marginal nonlinear decision process;
- MILP = exact binary budget/cell constraints over linearized robust coefficients, then nonlinear reevaluation.

## Formal cross-check for all named policy profiles

| Policy | Credits | Projects | P10 nonlinear | Median nonlinear | P90 nonlinear |
|---|---:|---:|---:|---:|---:|
| balanced | 10 | 4 | 64.45 | 80.71 | 96.60 |
| equity | 10 | 4 | 64.45 | 80.71 | 96.60 |
| access | 10 | 4 | 63.75 | 79.90 | 96.88 |
| low_regret | 10 | 4 | 64.45 | 80.71 | 96.60 |

Some formal profiles collapse to the same plan under current linearized coefficients. V4 preserves that result rather than manufacturing differentiation.

## Sampled multi-objective trade-offs

V4 samples **9** equity/access weight combinations, producing **4** unique portfolios and **4** non-dominated portfolios in the current checkpoint.

This is a **sampled non-dominated set**, not an exhaustive mathematical Pareto frontier.

## What this supports

- budget constraints are enforced;
- uncertainty comparison is reproducible;
- policy assumptions can change project membership;
- consensus and disagreement can be surfaced;
- independent optimization formulations produce comparable-order outputs.

## What this does not support

- physical calibration of intervention effects;
- validated landslide prediction skill;
- casualties/people saved;
- real COP benefit/cost optimality.
