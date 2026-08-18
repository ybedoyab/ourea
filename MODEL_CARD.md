# OUREA Competition V4 — model card

## Intended purpose

OUREA is **adaptation decision support** for vulnerable urban hillsides.

It is designed to help ask:

> Which physical adaptation portfolios remain useful across uncertain climate/effectiveness assumptions and explicit public-policy priorities?

## Not intended for

OUREA is not:
- a landslide early-warning system;
- a replacement for SIATA;
- a geotechnical design package;
- a building-level failure-probability model;
- an autonomous investment authority;
- an evacuation-routing simulator.

## Model status

`development-priors-not-calibrated`

Stable spatial inputs are real/official or explicitly derived from official sources.

The dynamic climate term, intervention-effect ranges, planning-credit costs and decision weights remain development settings pending calibration/co-design.

## City screening

V4 city screening combines:
- official hazard coverage;
- official 2026 population projections;
- official 2023 comuna-level IMCV/AMPI.

Limitations:
- population is assumed uniformly distributed inside each barrio for hazard-exposure screening;
- IMCV is comuna-level, not barrio-level;
- screen is static, not dynamically SIATA-driven.

See `CITY_SCREEN_METHOD.md`.

## Detailed exposure

The sandbox population is a DANE census-based planning proxy allocated to buildings.

It is not a current household census.

## Dynamic Climate Stress

Current controls:
- hypothetical storm depth;
- antecedent wetness;
- planning horizon.

The UI explicitly states these are not SIATA return periods or calibrated storm classes.

Target replacement:
- real SIATA rainfall features + historical validation.

## Intervention families

### Rainwater harvesting
Directly modeled quantity:
- potential captured roof runoff under storage/participation assumptions.

Not yet calibrated:
- captured water → slope-risk benefit.

### Drainage / water management
Current opportunity uses a mapped corridor proxy.

It is not drainage capacity.

### Restoration / soil bioengineering
Current model includes uncertain effect + maturity delay.

It is not instant deterministic stabilization.

## Uncertainty

V4 separates:
1. climate uncertainty;
2. intervention-effect uncertainty.

Common-random-number design is used for comparative evaluation.

## Public-policy profiles

### Balanced
Default exposure-reduction lens with modest equity/access emphasis.

### Equity-first
Stronger weight on stratum-1 exposure.

Local limitation: the detailed sandbox is already overwhelmingly stratum 1, limiting the granularity of this proxy.

### Access-first
Stronger weight on mapped access relevance.

### Low-regret
Stronger penalty on lower-tail uncertainty.

These profiles are not moral/scientific truths. They exist to make policy preferences inspectable.

## Sampled trade-offs

V4 samples equity/access weights and returns non-dominated portfolios among those samples.

This is not an exhaustive mathematical Pareto frontier.

## Formal cross-check

An independent binary MILP uses linearized robust coefficients and exact budget/cell constraints, then re-evaluates selected portfolios with nonlinear multiplicative effects.

## Prohibited interpretations

Do not describe V4 outputs as:
- landslide probability;
- expected casualties;
- people saved/protected;
- avoided monetary losses;
- exact current population;
- engineering design;
- drainage capacity;
- COP investment recommendation;
- exhaustive Pareto optimality;
- probability of true project optimality.

## Human oversight

Final decisions remain with:
- responsible public authorities;
- affected communities;
- engineering/geotechnical professionals;
- environmental/planning authorities.

## Validation path

1. raw SIATA QA;
2. verified June 2022 event timestamp;
3. hindcast/sensitivity analysis;
4. additional historical events if available;
5. local intervention-effect distributions;
6. comparable cost distributions;
7. stakeholder policy-weight co-design;
8. structured pilot user testing.
