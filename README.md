# OUREA — Competition Build V4

**OUREA** — Optimized Urban Resilience through Equity & Adaptation

**From climate risk to robust action.**

AI decision intelligence for climate-resilient hillsides. Medellín is the first proving ground.

Current product flow:

`CITY SCREEN → DETAILED PROVING GROUND → STRESS THE FUTURE → TEST ACTION → COMPARE ROBUST PORTFOLIOS → UNDERSTAND TRADE-OFFS → INSPECT EVIDENCE`

## Why V4 is different

Medellín already has strong hazard mapping and early-warning capability. OUREA deliberately does **not** build another warning system.

Instead it asks:

> Given limited budgets and uncertain climate/effectiveness assumptions, which physical adaptation portfolio should a city test first—and how stable is that recommendation?

## V4 city scale

The city screen now combines:
- official mass-movement hazard coverage;
- official Medellín/DANE **2026 barrio population projections**;
- official **2023 IMCV/AMPI-AMPI** socioeconomic conditions.

It provides three transparent planning lenses:
- **Exposure**;
- **Balanced**;
- **Equity**.

Current safe population matching:
- 249 official urban barrio population records;
- 248 safely matched to the current 271-polygon city export;
- one ambiguous record deliberately left unmatched rather than forced.

Llanaditas No.2 currently ranks:
- #9 hazard-only;
- #7 exposure;
- #13 balanced;
- #22 equity.

See:
`CITY_SCREEN_METHOD.md`

## Detailed proving ground

Upper Comuna 8 / Llanaditas–El Faro.

Current detailed sandbox:
- **1,588 cadastral buildings**;
- **~4,057 people** as a DANE census-based planning proxy;
- **1,445 buildings** intersecting official high mass-movement hazard;
- **1,540 buildings** assigned stratum 1;
- median slope **~25.4°**;
- real Medellín **1 m terrain** rendered with local Terrain-RGB tiles.

## Decision intelligence

### Manual planning

A user can choose planning cells and place:
1. rainwater harvesting;
2. drainage / water management;
3. restoration / soil bioengineering.

### Four robust policy options

V4 generates four explicit policy lenses under the same budget/data:
- **Balanced**;
- **Equity-first**;
- **Access-first**;
- **Low-regret**.

The UI does not claim one objective is universally correct.

After generation it highlights the option with the **highest P10 lower-tail benefit in the current development ensemble**, not “the optimal plan”.

### Robustness diagnostics

V4 includes:
- common-random-number Monte Carlo;
- P10 / median / P90;
- downside retention;
- budget robustness frontier;
- project-selection stability across independent uncertainty resamples;
- sampled non-dominated equity/access/robustness trade-offs;
- project-level “Why here?” explanation;
- formal binary MILP cross-check with nonlinear 500-future reevaluation.

See:
`POLICY_PORTFOLIOS_METHOD.md`

## SIATA readiness

The raw historical station series is pending, but the integration path is already implemented.

`siata_ingest.py`:
- auto-detects common source columns;
- supports explicit incremental/cumulative gauge modes;
- preserves missing rainfall as missing;
- calculates 1 h / 6 h / 24 h / 3 d / 7 d / 15 d accumulations;
- tracks rolling-window coverage;
- writes a quality report;
- creates the optional UI replay timeline.

`siata_event_diagnostics.py` summarizes observed rainfall around a **verified** event timestamp without fitting a fake prediction model.

See:
`SIATA_CALIBRATION_PLAN.md`

## Evidence and cost discipline

V4 labels major inputs as:
- official/observed;
- official projection;
- planning proxy;
- derived screening proxy;
- development prior;
- planning-credit placeholder.

The optimizer still uses **planning credits, not COP**.

Local cost evidence is strong enough to establish implementation precedent and scale, but not yet homogeneous enough for fair cross-intervention optimization.

V4 now includes an official Medellín 2023 procurement budget ceiling equivalent to approximately **COP 2.119 million per installed 1,000 L household rainwater system** in Santa Elena. It remains an evidence anchor—not a Comuna 8 unit price.

See:
`COST_EVIDENCE.md`

## Scientific boundary

The spatial datasets are real. The following remain development priors until calibration:
- the dynamic Climate Stress formulation;
- intervention-effect ranges;
- planning-credit costs;
- public-policy objective weights.

Do **not** call current outputs:
- landslide probability;
- calibrated risk;
- people saved/protected;
- avoided losses;
- current exact household population;
- drainage capacity;
- a COP investment recommendation;
- an exhaustive Pareto frontier.

## Architecture

V4 follows practical SOLID / KISS / DRY constraints:

- `frontend/src/components/` — focused presentation / interaction;
- `frontend/src/domain/` — decision/scenario logic;
- `frontend/src/services/` — data and map lifecycle;
- `frontend/src/config/` — **single numerical source of truth**;
- `frontend/src/utils/` — deterministic utilities.

All development numbers, sample counts and reproducibility seeds live in:

`frontend/src/config/modelParameters.json`

## Run locally

Clone:

```bash
git clone https://github.com/ybedoyab/ourea.git
cd ourea
```

Node.js `>=20.19` is required.

### Windows

```bat
run_windows.bat
```

### macOS / Linux

```bash
./run_mac_linux.sh
```

The launcher performs:

`npm install → npm test → npm run build → npm run dev`

and fails fast if any gate fails.

## QA

```bat
qa_windows.bat
```

or:

```bash
./qa_mac_linux.sh
```

The user should run final browser QA locally after `npm install`.

## Competition documents

- `SUBMISSION_DRAFT_V4.md`
- `DECK_OUTLINE_V4.md`
- `DEMO_SCRIPT_V4.md`
- `PILOT_6_MONTHS.md`
- `JUDGE_QA.md`
- `OFFICE_HOURS_BRIEF.md`
- `COMPETITIVE_LANDSCAPE.md`
- `MODEL_CARD.md`
- `DATA_PROVENANCE.md`
- `CITY_SCREEN_METHOD.md`
- `POLICY_PORTFOLIOS_METHOD.md`
- `SIATA_CALIBRATION_PLAN.md`

## Highest-value remaining scientific gate

**SIATA raw rainfall + verified June 2022 event timestamp.**

Once those arrive, the architecture is already prepared to replace the provisional dynamic climate term and run the historical hindcast without redesigning the product.
