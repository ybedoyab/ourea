# OUREA — local cost evidence ladder (V4)

**Status:** local evidence is now strong enough to define intervention typologies and plausible cost scale, but **not yet strong enough to replace planning credits with COP in the optimizer**.

The key rule remains: do not divide a heterogeneous project budget by an arbitrary length/area/system count and call the result a transferable unit cost.

## 1. Rainwater harvesting

### Medellín / Comuna 1 — exact local technical specification

A 2025 Fundación Universidad de Antioquia procurement document specifies **130 rainwater systems**. Each system includes, among other items:

- 3-inch PVC conveyance;
- up to 10 m of gutter/canaleta;
- fittings;
- debris filter mesh;
- **250 L rainwater storage tank**;
- garden tap;
- PVC cleaner/adhesive;
- metal support/base;
- installation labor;
- work-at-height/internal transport requirements;
- user instructions/labeling;
- transport to each dwelling.

The document explicitly says **130 rainwater tanks/systems must be supplied and installed**.

Source:  
`https://www.fundacionudea.com/sitio/img/Documentos%20referencia%202/Segunda_Invitaci%C3%B3n_FUDEA_C1_HOGA.pdf`

**V4 use:** this is now the preferred local *technical intervention archetype* for household RWH.

**Still missing:** the corresponding awarded/evaluated economic line that isolates the 130-system RWH component.

---

### Medellín / San Sebastián de Palmitas — exact RWH budget component

A separate 2025 evaluation document gives the official budget ceiling for a sustainable-households package:

- total: **COP 637,227,746**
- rainwater systems sub-budget: **COP 75,935,360**

Source:  
`https://www.fundacionudea.com/sitio/img/Documentos%20Referencia/Adendas/Evaluaciones/1.%20evaluacio%CC%81n%20a%20participar_c50-%20hogares.pdf`

**V4 use:** confirms that rainwater systems are budgeted as a distinct local procurement component.

**Critical guardrail:** the document does not state the system quantity in the same evidence record. Do **not** divide COP 75,935,360 by the 130 systems from the Comuna 1 procurement; those are different procurement contexts.

---

### Comuna 8 relevance

Medellín's SEFFIP portal lists a 2025 Comuna 8 activity for **captación de aguas lluvias**, associated with contract **4600105177 of 2025** and Universidad de Antioquia / environmental programming.

Source:  
`https://ppaunclic.medellin.gov.co/reportes/proyectos/`

**V4 use:** validates that rainwater capture is not an imported intervention idea; it is already present in the target commune's public/community adaptation landscape.

## 2. Drainage / hydraulic / water-management scale

Official Medellín 2026 projects provide contemporary local scale references:

| Reference | Reported scope | Reported budget | Naive normalization* |
|---|---:|---:|---:|
| Altavista | 550 m concrete hydraulic intervention | COP 13.485 B | ~COP 24.5 M/m |
| El Pelón | 98 m stepped cover + inspection chambers | COP 2.681 B | ~COP 27.4 M/m |
| La Cabuyala | 35 m cover + public-space works | COP 1.285 B | ~COP 36.7 M/m |
| La Chorrera | bioengineering + 100 m box culvert + receiving channel + networks | COP 4.961 B | ~COP 49.6 M/reported m |
| La Honda | 298 m hydraulic component | COP 12.000 B hydraulic component | ~COP 40.3 M/m |
| La Aguadita, Comuna 8 | 90 m retaining wall + pedestrian bridge | COP 3.092 B | ~COP 34.4 M/reported m |

\*These ratios are **descriptive scale references only**. They are not comparable engineering unit prices because project scopes differ.

Sources:
- `https://www.medellin.gov.co/es/sala-de-prensa/noticias/medellin-inicia-el-2026-con-seis-nuevas-obras-hidraulicas-en-ejecucion-y-el-reto-de-intervenir-91-quebradas/`
- `https://www.medellin.gov.co/es/sala-de-prensa/noticias/la-alcaldia-de-medellin-acelera-obras-de-mi-rio-mis-quebradas-para-mitigar-inundaciones-y-recuperar-espacio-publico/`
- `https://www.medellin.gov.co/es/sala-de-prensa/noticias/mi-rio-mis-quebradas-avanza-con-el-93-de-ejecucion-de-obras-en-la-quebrada-la-honda-en-el-nororiente-de-la-ciudad/`

Machine-readable descriptive table:  
`data/derived/local_infrastructure_cost_scale.csv`

### What this tells us

The rough normalized figures span approximately **COP 24–50 million per reported metre** even before correcting for radically different scopes. That spread is evidence **against** pretending there is one drainage unit cost.

The final cost model should define explicit typologies such as:
- small drainage correction / surface-water management;
- channel/culvert intervention;
- retaining/stabilization package;
- combined hydraulic + public-space/bioengineering project.

Each typology needs a separate cost distribution.

## 3. Restoration / bioengineering

### Comuna 8 / DAGRD — local project-scale anchor

A 2019 Comuna 8 DAGRD project sheet reports:

- mitigation works: **COP 380,000,000**
- supervision: **COP 20,000,000**
- total: **COP 400,000,000**

The project explicitly includes improving stability through bioengineering / minor mitigation works.

Source:  
`https://www.medellin.gov.co/ndesarrollo/wp-content/uploads/FICHAS/C8/2019/FP/19_FP_PP_C8_DAGRD.pdf`

**V4 use:** local project-scale evidence for the bioengineering/mitigation family.

**Do not use as:** COP/m² or COP/cell without installed quantities and scope decomposition.

## 4. Why the app still uses planning credits

We now have three different evidence strengths:

1. **RWH:** strong local technical archetype; incomplete isolated economic award.
2. **Hydraulic/drainage:** several current local budgets, but heterogeneous scope.
3. **Bioengineering:** local project-scale budget, but no transferable quantity basis.

That is enough to establish **feasibility and realistic order of magnitude**, but not enough for fair cross-intervention optimization in COP.

Planning credits therefore remain a deliberate scientific/product decision, not missing functionality.

## 5. Cost model required before final COP optimization

For each intervention family, create a distribution with:

- typology;
- quantity basis;
- base year;
- direct construction/supply cost;
- design/supervision;
- transport/access premium;
- maintenance;
- contingency;
- uncertainty distribution;
- evidence tier.

Only after those fields are populated should OUREA expose a COP budget slider.

## 6. Immediate next evidence target

Highest-value missing item:

**recover the awarded/evaluated economic proposal for the 130-system Comuna 1 RWH procurement**, or another Medellín procurement where exact RWH system quantity and isolated total price coexist.

That would allow the first defensible local `COP/system` prior.


## V4 addition — first defensible local COP/system ceiling

A 2023 Fundación Universidad de Antioquia procurement for **Santa Elena, Medellín** is unusually useful because the technical specification and budget align cleanly:

- **50 household rainwater systems**
- **1,000 L tank per system**
- total official budget for the household-sustainable stimuli: **COP 105,972,500**
- the household-stimulus section lists the rainwater system as the product for those 50 households
- included scope: tank, connections, support structure, installation, transport, practical user training and a minimum six-month warranty

This yields a transparent **official budget ceiling** of:

**COP 2,119,450 per installed 1,000 L system**

Sources:
- invitation/specification:  
  `https://www.fundacionudea.com/sitio/img/nvitaci%C3%B3n_2_a_participar_C90_hog.pdf`
- evaluation confirming the same official budget ceiling:  
  `https://www.fundacionudea.com/sitio/img/16.%20evaluaci%C3%B3n%20a%20participar_comuna%2090%20hogares%20y%20sector%20comercio-2023.pdf`

### Important interpretation

This is **not** an awarded market price and should not be inserted directly into the Comuna 8 optimizer.

Reasons:
- it is an official procurement **ceiling**;
- Santa Elena is a different logistical/contextual setting;
- the system is 1,000 L, while another 2025 Medellín procurement archetype uses 250 L systems;
- the current OUREA intervention is still an intervention family rather than one finalized engineering package.

What V4 can now say defensibly is:

> Medellín procurement evidence establishes a real local order-of-magnitude anchor for installed household rainwater systems, while OUREA keeps the optimizer in planning credits until capacity, location, logistics and project typology are made comparable.

Machine-readable provenance:
`data/derived/cost_reference_registry_v4.json`
