# Ourea — SIATA calibration and historical-validation plan

## Current status

Raw SIATA station data have been requested by email for approximately **5–21 June 2022** for upper Comuna 8 / El Faro / Altos de La Torre / Llanaditas and nearby stations.

Ourea does not ship a synthetic historical rainfall timeline.

The software required to ingest and inspect the real response is already implemented.

## Stage 1 — Raw-data QA

Run:

```bash
python scripts/siata_ingest.py <raw.csv>
```

The adapter:
- auto-detects common timestamp/rain/station columns or accepts explicit mappings;
- supports explicit incremental or cumulative rain-gauge mode;
- does not guess gauge semantics;
- preserves missing rain as missing rather than false zero;
- rejects/records physically invalid negative increments;
- regularizes the time axis;
- calculates rolling-window data coverage;
- writes `siata_quality_report.json`.

## Stage 2 — Rainfall features

Target features:
- rain increment;
- 1 h accumulation;
- 6 h accumulation;
- 24 h accumulation;
- 3 d accumulation;
- 7 d accumulation;
- 15 d accumulation.

Each rolling feature includes a coverage field. Accumulations below the configured coverage threshold remain null.

## Stage 3 — Verify the historical event timestamp

Before event-level claims, independently verify the exact date/time and affected area of the June 2022 El Faro–Altos de La Torre event.

Do not infer an exact timestamp from an approximate news date.

## Stage 4 — Event rainfall diagnostic

Once the timestamp is verified:

```bash
python scripts/siata_event_diagnostics.py \
  data/derived/siata_features.csv \
  --event-time <VERIFIED_TIMESTAMP>
```

The diagnostic reports, by station:
- nearest observation to the event;
- time distance to event;
- event-state rainfall accumulations;
- pre-event peaks;
- coverage at event time;
- analysis-window metadata.

It explicitly does **not** fit a landslide model.

## Stage 5 — Station relevance

Select/weight stations based on:
- geographic proximity;
- elevation/topographic relevance where available;
- data completeness;
- known sensor metadata;
- consistency across nearby stations.

Do not choose a station solely because it produces the desired hindcast shape.

## Stage 6 — Dynamic climate term

Only after raw QA should the current hypothetical rain/wetness term be replaced.

Candidate features should be compared transparently, e.g.:
- short-duration intensity/accumulation;
- 24 h rainfall;
- 3 d antecedent accumulation;
- 7 d / 15 d antecedent wetness proxy;
- soil moisture if SIATA supplies a defensible series.

Avoid fitting a complex ML model if event labels are too sparse.

## Stage 7 — Historical hindcast

Primary validation question:

> Does the dynamic Climate Stress indicator increase in the known affected area before/during the verified historical event?

Useful outputs:
- time series of climate driver;
- distribution of stress across buildings/cells;
- event-area vs nearby comparison;
- data-coverage overlays;
- sensitivity to reasonable feature/weight choices.

Do not claim:
- exact event prediction;
- household-level failure probability;
- calibrated false-positive/false-negative rate unless multiple labeled events support it.

## Stage 8 — Model complexity rule

If only one well-documented event is available:
- use a transparent evidence-backed climate-stress formulation;
- perform a hindcast and sensitivity analysis;
- do not train a high-capacity ML classifier on one event.

If enough independent historical events become available:
- separate train/calibration and hold-out events;
- compare against a transparent baseline;
- consider a lightweight surrogate/ML model only if it improves decision usefulness without sacrificing interpretability.

## Acceptance gates before final calibrated claims

Minimum:
1. raw station metadata documented;
2. missingness/coverage quantified;
3. exact event timestamp verified;
4. no missing-as-zero treatment;
5. station selection justified before evaluating the desired result;
6. dynamic formulation documented/versioned;
7. historical result shown with uncertainty/sensitivity;
8. all claims stay within what the data support.

## Integration into Ourea

The existing product architecture is deliberately separable:

`raw SIATA → QA/features → climate-stress model → scenario engine → robust portfolios → UI`

Therefore SIATA should replace/calibrate the dynamic climate term without requiring a rewrite of:
- city screening;
- 3D terrain/buildings;
- intervention opportunity model;
- uncertainty framework;
- policy portfolios;
- budget frontier;
- decision export.
