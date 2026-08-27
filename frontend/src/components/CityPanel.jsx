import { BRAND } from '../config/brand.js';
import { CITY_LENSES } from '../config/uiCopy.js';
import { Guardrail, SectionHeading } from './SectionHeading.jsx';
import { Metric } from './Metric.jsx';

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function topScreening(screening, lens, limit = 8) {
  if (!screening?.features?.length) return [];
  const rankField = CITY_LENSES[lens]?.rankField ?? CITY_LENSES.balanced.rankField;

  return [...screening.features]
    .filter((feature) => numeric(feature.properties[rankField]) != null)
    .sort(
      (a, b) =>
        Number(a.properties[rankField]) -
        Number(b.properties[rankField]),
    )
    .slice(0, limit);
}

function populationText(properties) {
  const population = numeric(properties.population_2026);
  return population == null
    ? 'No matched official 2026 resident projection'
    : `${Math.round(population).toLocaleString()} projected residents · 2026`;
}

function lensSignal(properties, lens) {
  if (lens === 'exposure') {
    const value = numeric(properties.hazard_weighted_population_proxy_2026);
    return value == null
      ? 'no population match'
      : `~${Math.round(value).toLocaleString()} hazard-weighted people proxy`;
  }
  if (lens === 'equity') {
    const imcv = numeric(properties.imcv_ampi_2023);
    return imcv == null ? 'IMCV unavailable' : `IMCV/AMPI ${imcv.toFixed(1)}`;
  }
  const population = numeric(properties.population_2026);
  return population == null
    ? 'no population match'
    : `${Math.round(population).toLocaleString()} people · 2026`;
}

export function CityPanel({
  screening,
  selectedBarrio,
  llanaditas,
  cityLens,
  onCityLensChange,
  onSelectBarrio,
  onOpenSandbox,
}) {
  const barrioCount = screening?.features?.length ?? 0;
  const populationMatched =
    screening?.features?.filter(
      (feature) => numeric(feature.properties.population_2026) != null,
    ).length ?? 0;
  const lens = CITY_LENSES[cityLens] ?? CITY_LENSES.balanced;
  const top = topScreening(screening, cityLens);
  const llanaditasRank = numeric(llanaditas?.properties?.[lens.rankField]);

  return (
    <>
      <p className="eyebrow">{BRAND.event} · city-scale screening</p>
      <h1>Screen the city. Then test action.</h1>
      <p className="lede">
        {BRAND.descriptor} Official hazard, 2026 population projections and socioeconomic
        conditions shortlist where a high-resolution adaptation sandbox is warranted.
      </p>
      <Guardrail>
        This is a transparent city-prioritization screen, not a dynamic climate forecast or an
        investment recommendation. Population is assumed uniformly distributed inside each barrio
        for the screening exposure proxy.
      </Guardrail>

      <section>
        <SectionHeading step={1} title="Choose a planning lens">
          The same official layers, three public-policy weights. Not separate datasets.
        </SectionHeading>

        <div className="city-lenses" role="radiogroup" aria-label="City screening lens">
          {Object.entries(CITY_LENSES).map(([id, config]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={cityLens === id}
              className={cityLens === id ? 'active' : ''}
              onClick={() => onCityLensChange(id)}
            >
              <b>{config.label}</b>
              <span>{config.question}</span>
            </button>
          ))}
        </div>
        <p className="lens-description">{lens.description}</p>

        <div className="metrics">
          <Metric
            label="Official barrio polygons"
            value={barrioCount.toLocaleString()}
          />
          <Metric
            label="2026 population-matched"
            value={`${populationMatched}/249`}
            hint="Official urban barrio population records safely matched to the current polygon export."
          />
          <Metric
            label="Detailed proving ground"
            value="Llanaditas No.2"
          />
          <Metric
            label={`${lens.label} rank there`}
            value={llanaditasRank ? `#${llanaditasRank}` : '—'}
            hint="Rank under the active lens. Llanaditas is the proving ground, not necessarily rank #1."
          />
        </div>

        <div className="screening-list" role="list">
          {top.map((feature) => {
            const properties = feature.properties;
            const rank = numeric(properties[lens.rankField]);
            const active =
              Number(selectedBarrio?.OBJECTID) ===
              Number(properties.OBJECTID);

            return (
              <button
                key={properties.OBJECTID}
                type="button"
                className={active ? 'screening-row active' : 'screening-row'}
                onClick={() => onSelectBarrio?.(properties)}
              >
                <b>#{rank}</b>
                <span>
                  {properties.BARRIO}
                  <i>
                    {properties.comuna_name
                      ? properties.comuna_name
                      : 'Special / unmatched polygon'}
                  </i>
                </span>
                <em>{lensSignal(properties, cityLens)}</em>
              </button>
            );
          })}
        </div>

        {selectedBarrio && (
          <div className="city-barrio-card">
            <div className="city-barrio-title">
              <div>
                <b>{selectedBarrio.BARRIO}</b>
                <span>
                  {selectedBarrio.comuna_name
                    ? `${selectedBarrio.comuna_name} · code ${selectedBarrio.barrio_code ?? '—'}`
                    : 'special/unmatched polygon'}
                </span>
              </div>
              <strong>
                {numeric(selectedBarrio[lens.rankField]) != null
                  ? `#${selectedBarrio[lens.rankField]}`
                  : '—'}
              </strong>
            </div>

            <div className="city-detail-grid">
              <span>
                <small>Projected population</small>
                <b>{populationText(selectedBarrio)}</b>
              </span>
              <span>
                <small>High-hazard area</small>
                <b>{Math.round(Number(selectedBarrio.high_share ?? 0) * 100)}%</b>
              </span>
              <span>
                <small>Hazard-weighted population proxy</small>
                <b>
                  {numeric(selectedBarrio.hazard_weighted_population_proxy_2026) == null
                    ? '—'
                    : `~${Math.round(
                        selectedBarrio.hazard_weighted_population_proxy_2026,
                      ).toLocaleString()}`}
                </b>
              </span>
              <span>
                <small>IMCV / AMPI 2023</small>
                <b>
                  {numeric(selectedBarrio.imcv_ampi_2023) == null
                    ? '—'
                    : Number(selectedBarrio.imcv_ampi_2023).toFixed(1)}
                </b>
              </span>
            </div>
          </div>
        )}

        <div className="proving-ground-card">
          <span>Next</span>
          <b>{BRAND.provingGround}</b>
          <p>
            {BRAND.provingGroundRole} — 1,588 buildings, real terrain, hazard, social exposure
            and access. Not chosen because it ranks first under every lens.
          </p>
          <button type="button" className="primary citycta" data-testid="open-sandbox" onClick={onOpenSandbox}>
            Open the Llanaditas proving ground
          </button>
        </div>
      </section>
    </>
  );
}
