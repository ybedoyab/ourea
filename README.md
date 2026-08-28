# Ourea

**Ourea** — Optimized Urban Resilience through Equity & Adaptation

**From climate risk to robust action.**

An evidence-backed decision sandbox that helps cities turn climate risk, budget constraints, equity and community safeguards into robust portfolios of urban resilience actions. Medellín is the first proving ground.

Public demo: https://ybedoyab.github.io/ourea/

Current product flow:

`CITY SCREEN → DETAILED PROVING GROUND → OBSERVED CLIMATE CONTEXT → EXPLORE RAINFALL → TEST ACTION → COMPARE ROBUST PORTFOLIOS → UNDERSTAND TRADE-OFFS → INSPECT EVIDENCE → COMMUNITY SAFEGUARDS → PLAN ALIGNMENT`

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

Community Evidence & Safeguards therefore records whether a technically robust portfolio has enough community evidence to advance. Missing records mean **not assessed**, never support, opposition or low risk. `planned` and `in_progress` stay **incomplete**. Only a documented `validated` review can become **community review recorded**. High livelihood, accessibility or displacement concerns mark the portfolio as **requires deliberation**. A malformed evidence file is **invalid**, not silently absent. None of these records change optimizer rankings.

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

After generation it highlights the option with the **highest P10 lower-tail benefit in the current ensemble**, not “the optimal plan”.

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

Optional **AI decision review** (Review step) turns those deterministic results into a field-validation brief. It is off unless `VITE_OUREA_AI_API_URL` is set. See `docs/product/ai-decision-review.md`.

## Observed climate context

Ourea anchors planning rainfall contexts in **CHIRPS v3 Final** for the Llanaditas / upper Comuna 8 0.05° cell. The application ships `frontend/public/data/climate_context.json` and never downloads CHIRPS at runtime.

The 1991–2020 climatology supplies three named presets — Typical wet conditions, High rainfall context, Extreme observed context — plus an Explore mode. Each visible rainfall figure carries source, period and accumulation window.

CHIRPS is a gridded estimate, not rain-gauge intensity at a hillside station. Daily series used for rolling windows allocate each Final pentad total uniformly across calendar days. These values are not landslide probability and not a real-time forecast.

Rebuild the shipped JSON from a windowed Latin America pentad extract (rasters stay in a local Git-ignored cache):

```bash
python scripts/build_climate_context.py
```

Optional SIATA station ingest remains available as a local-intensity comparison tool. It is not required for the decision product. See `docs/methodology/climate-context.md`.

## Evidence and cost discipline

Ourea labels major inputs as:
- observed / official;
- official projection;
- planning proxy;
- derived screening proxy;
- observed gridded climatology;
- explicit planning prior;
- planning-credit budget unit.

The optimizer still uses **planning credits, not COP or USD**.

The decision brief shows a **pre-feasibility US$ envelope** (low/base/high) from versioned TRM and local comparators. Planning credits stay inside portfolio comparison. No cost figure is an offer, contract or engineering estimate.

Local RWH evidence includes an official Medellín 2023 procurement budget ceiling equivalent to approximately **COP 2.119 million per installed 1,000 L household system** in Santa Elena (~US$782 after 2026 normalization). It remains an evidence anchor—not a Comuna 8 unit price.

See `docs/methodology/cost-evidence.md`.

## Scientific boundary

The spatial datasets are real. Climate scenarios are observationally anchored. The following remain explicit planning assumptions, not missing product features:
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
- a COP or USD investment recommendation, offer or contract;
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

The launcher scripts must be executable on macOS/Linux:

```bash
chmod +x run_mac_linux.sh qa_mac_linux.sh
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

Playwright covers city screen, climate context, portfolios, benchmark, community evidence, export, keyboard and 390×844 / tablet / desktop viewports.

## Documentation

Start at [`docs/README.md`](docs/README.md).
