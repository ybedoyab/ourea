# Ourea — 6-month pilot plan

## Pilot objective

Validate whether OUREA improves **adaptation prioritization and decision transparency** for vulnerable urban hillsides.

The pilot is not designed to prove that software can replace:
- geotechnical studies;
- drainage engineering;
- SIATA / emergency-warning systems;
- accountable public/community decision-making.

## Month 1 — Decision co-design and governance

Activities:
- identify community organizations and legitimate representatives for the pilot area; do not invent partners;
- agree data governance: who may record, review, contest and approve community evidence;
- map concerns, priorities and veto criteria without converting them into optimizer weights;
- validate the language used to explain uncertainty;
- confirm the real planning/approval workflow with city/community/technical stakeholders;
- define the decision questions Ourea should and should not answer;
- review the four policy profiles;
- confirm data ownership/provenance expectations;
- agree on pilot success metrics;
- verify the June 2022 event timestamp and relevant SIATA stations.

Deliverable:
**pilot decision charter + governance/evidence matrix**.

## Month 2 — SIATA calibration and historical validation

Activities:
- ingest raw station data with QA;
- quantify missingness and rolling-window coverage;
- derive 1 h / 6 h / 24 h / 3 d / 7 d / 15 d rainfall features;
- reconstruct the verified June 2022 event window;
- replace the hypothetical dynamic climate term;
- test hindcast behavior and sensitivity;
- test additional historical events if defensible data exist.

Deliverable:
**historical hindcast report + calibrated dynamic-driver candidate**.

## Months 3 and 4 — Intervention, cost, policy and co-design

Month 3 activities:
- finalize local intervention typologies with residents and technical experts;
- evaluate possible impacts on everyday mobility, work, care and maintenance;
- separate RWH capacities/specifications;
- define drainage/water-management project classes;
- define locally appropriate restoration/bioengineering classes;
- convert evidence into effect distributions;
- convert comparable procurement/project evidence into cost distributions;
- separate direct cost, supervision, logistics, maintenance and contingency.

Month 4 activities:
- run calibrated uncertainty ensembles;
- review equity/access/low-regret objective definitions with stakeholders;
- convert **only agreed** criteria into transparent constraints; keep disagreements and alternatives visible instead of averaging incompatible positions;
- compare browser marginal optimizer and formal MILP alternatives;
- produce budget robustness curves;
- identify stable/unstable project decisions;
- surface near-performing alternatives rather than only a winner.

Deliverables:
**versioned intervention/effect/cost registry** and **calibrated robust decision-engine beta**.

## Month 5 — Structured user testing

Participants:
- public-sector planners/risk managers;
- technical/engineering experts;
- community representatives;
- academic/research partner if available.

No organizations are named as confirmed partners.

Compare baseline planning workflow vs Ourea on:
- time required to compare alternatives;
- ability to understand uncertainty;
- ability to identify evidence gaps;
- ability to explain why a project is selected;
- confidence in distinguishing proxy/model output from engineering evidence;
- agreement/disagreement with policy weights;
- usability of city → hotspot → portfolio workflow;
- percentage of projects reviewed with community evidence;
- open livelihood, accessibility or displacement concerns;
- portfolio changes after deliberation;
- confidence in data provenance;
- difference between the initial technical recommendation and the deliberated result.

Deliverable:
**user-testing report + product revisions**.

## Month 6 — Decision package and replication

Activities:
- produce one pilot-area adaptation decision package;
- include uncertainty, provenance, alternative policies and unresolved engineering questions;
- run city screen → hotspot → detailed planning workflow end-to-end;
- define scale-up data contract;
- test replication checklist for another Medellín hillside or partner city.

Deliverable:
**pilot decision package + scale-up roadmap**.

## Pilot metrics

Use decision-quality metrics rather than exaggerated hazard claims:
- % of model parameters with evidence/confidence classification;
- SIATA data coverage/quality;
- historical hindcast behavior;
- number of futures evaluated;
- P10/median/P90 portfolio benefit proxies;
- project-selection stability;
- number of near-performing alternatives surfaced;
- user decision time;
- stakeholder ability to explain trade-offs;
- number of recommendations explicitly requiring engineering/geotechnical follow-up;
- reproducibility of exported decision packages;
- share of selected projects with community review;
- number of safeguards still open after deliberation.

## Pilot team structure

Solo-builder core can be extended through pilot partners rather than pretending one person can supply all disciplines.

Suggested roles:
- product/AI/geospatial lead;
- city risk/planning counterpart;
- hydrometeorological/SIATA data counterpart;
- geotechnical/drainage reviewer;
- community liaison/representative;
- evaluation/research advisor.

## Governance principle

OUREA remains **decision support**.

Final infrastructure decisions remain with responsible public authorities, qualified professionals and affected communities.
