# Ourea

**Ourea** — Optimized Urban Resilience through Equity & Adaptation

**From climate risk to robust action.**

Adaptation investment decision intelligence under uncertainty for vulnerable urban hillsides. Medellín is the first proving ground.

Current product flow:

`CITY SCREEN → DETAILED PROVING GROUND → STRESS THE FUTURE → TEST ACTION → COMPARE ROBUST PORTFOLIOS → UNDERSTAND TRADE-OFFS → INSPECT EVIDENCE → COMMUNITY SAFEGUARDS`

## Why Ourea is different

Medellín already has strong hazard mapping and early-warning capability. Ourea deliberately does **not** build another warning system.

Instead it asks:

> Given limited budgets and uncertain climate/effectiveness assumptions, which physical adaptation portfolio should a city test first—and how stable is that recommendation?

The differentiator is comparison of physical adaptation portfolios under uncertainty, limited budget, explicit public objectives and auditable evidence.

Ourea is not:
- a landslide predictor;
- an early-warning system;
- a generic digital twin;
- a community-acceptance predictor;
- an automatic resettlement recommender;
- a substitute for geotechnical studies, authorities or communities.

## Informal and marginalized settlements

Innovate4Cities 2026 awards additional points when solutions integrate underserved communities through inclusive urban planning and service delivery.

Ourea already works at city scale with official hazard, 2026 population projections and 2023 IMCV/AMPI. Those layers are **not** community participation. Socioeconomic indices at comuna scale and stratum-1 building share do not prove that a portfolio is socially acceptable.

Community Evidence & Safeguards therefore records whether a technically robust portfolio has enough community evidence to advance. Missing records mean **not assessed**, never support, opposition or low risk. High livelihood, accessibility or displacement concerns mark the portfolio as **requires deliberation**. They do not change optimizer rankings.

The Moravia neighborhood in Medellín is documented as a learning case for territorial attachment, livelihoods and participation. It is **not** the current proving ground and is not used to alter rankings. See `docs/research/case-studies/moravia.md`.

## City scale

The city screen combines:
- official mass-movement hazard coverage;
- official Medellín/DANE **2026 barrio population projections**;
- official **2023 IMCV/AMPI** socioeconomic conditions.

It provides three transparent planning lenses:
- **Exposure**;
- **Balanced**;
- **Equity**.

Current safe population matching:
- 249 official urban barrio records;
- 248 safely matched to the current 271-polygon city export;
- one ambiguous record deliberately left unmatched rather than forced.

Llanaditas No.2 currently ranks:
- #9 hazard-only;
- #7 exposure;
- #13 balanced;
- #22 equity.

See `docs/methodology/city-screen.md`.

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

Ourea generates four explicit policy lenses under the same budget/data:
- **Balanced**;
- **Equity-first**;
- **Access-first**;
- **Low-regret**.

The UI does not claim one objective is universally correct.

After generation it highlights the option with the **highest P10 lower-tail benefit in the current development ensemble**, not “the optimal plan”.

### Robustness diagnostics

Ourea includes:
- common-random-number Monte Carlo;
- P10 / median / P90;
- downside retention;
- budget robustness frontier;
- project-selection stability across independent uncertainty resamples;
- sampled non-dominated equity/access/robustness trade-offs;
- project-level “Why here?” explanation;
- formal binary MILP cross-check with nonlinear 500-future reevaluation.

See `docs/methodology/policy-portfolios.md`.

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

See `docs/methodology/siata-calibration.md`.

## Evidence and cost discipline

Ourea labels major inputs as:
- official/observed;
- official projection;
- planning proxy;
- derived screening proxy;
- development prior;
- planning-credit placeholder.

The optimizer still uses **planning credits, not COP**.

Local cost evidence is strong enough to establish implementation precedent and scale, but not yet homogeneous enough for fair cross-intervention optimization.

Ourea includes an official Medellín 2023 procurement budget ceiling equivalent to approximately **COP 2.119 million per installed 1,000 L household rainwater system** in Santa Elena. It remains an evidence anchor—not a Comuna 8 unit price.

See `docs/methodology/cost-evidence.md`.

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
- an exhaustive Pareto frontier;
- community acceptance.

## Architecture

Ourea follows practical SOLID / KISS / DRY constraints:

- `frontend/src/components/` — focused presentation / interaction;
- `frontend/src/hooks/` — data loading, map lifecycle and portfolio workspace;
- `frontend/src/domain/` — decision/scenario logic;
- `frontend/src/services/` — data and map lifecycle;
- `frontend/src/config/` — **single numerical, copy, path and guardrail source of truth**;
- `frontend/src/utils/` — deterministic utilities.

All development numbers, sample counts and reproducibility seeds live in:

`frontend/src/config/modelParameters.json`

Scientific guardrails live in:

`frontend/src/config/scientificGuardrails.json`

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

## Documentation

Start at [`docs/README.md`](docs/README.md).

## Highest-value remaining scientific gate

**SIATA raw rainfall + verified June 2022 event timestamp.**

Once those arrive, the architecture is already prepared to replace the provisional dynamic climate term and run the historical hindcast without redesigning the product.
