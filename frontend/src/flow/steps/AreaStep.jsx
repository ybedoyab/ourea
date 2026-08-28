import { CITY_LENSES } from '../../config/uiCopy.js';
import { BRAND } from '../../config/brand.js';
import {
  CITY_SCREEN_CONTRACT,
  countSafePopulationMatches,
  topScreening,
} from '../../domain/cityScreen.js';
import { numeric } from '../../domain/numeric.js';
import { Metric } from '../../components/Metric.jsx';
import { LensIcon } from '../../components/FlowIcons.jsx';
import { FlowActions } from '../FlowActions.jsx';
import { StepShell } from '../StepShell.jsx';

function lensSignal(properties, lens) {
  if (lens === 'exposure') {
    const value = numeric(properties.hazard_weighted_population_proxy_2026);
    return value == null
      ? 'no population match'
      : `~${Math.round(value).toLocaleString('en-US')} hazard-weighted people proxy`;
  }
  if (lens === 'equity') {
    const imcv = numeric(properties.imcv_ampi_2023);
    return imcv == null ? 'IMCV unavailable' : `IMCV/AMPI ${imcv.toFixed(1)}`;
  }
  const population = numeric(properties.population_2026);
  return population == null
    ? 'no population match'
    : `${Math.round(population).toLocaleString('en-US')} people · 2026`;
}

export function AreaStep({
  state,
  screening,
  selectedBarrio,
  llanaditas,
  onLensChange,
  onSelectBarrio,
  onAnalyze,
  onSeeWhy,
  onLoadExample,
}) {
  const lens = CITY_LENSES[state.cityLens] ?? CITY_LENSES.balanced;
  const top = topScreening(screening, state.cityLens);
  const populationMatched = countSafePopulationMatches(screening);
  const llanaditasRank = numeric(llanaditas?.properties?.[lens.rankField]);

  return (
    <StepShell
      state={state}
      actions={(
        <FlowActions
          hideBack
          continueLabel="Analyze Llanaditas"
          continueTestId="open-sandbox"
          onContinue={onAnalyze}
          extra={(
            <button type="button" className="flow-tertiary" data-testid="see-why-area" onClick={onSeeWhy}>
              See why this area
            </button>
          )}
        />
      )}
    >
      <div className="city-lenses" role="radiogroup" aria-label="City screening lens">
        {Object.entries(CITY_LENSES).map(([id, config]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={state.cityLens === id}
            className={state.cityLens === id ? 'active' : ''}
            onClick={() => onLensChange(id)}
          >
            <span className="choice-icon"><LensIcon id={id} /></span>
            <b>{config.label}</b>
            <span>{config.question}</span>
          </button>
        ))}
      </div>
      <p className="lens-description">{lens.description}</p>

      <div className="metrics compact-metrics">
        <Metric
          label="Population matches"
          value={`${populationMatched}/${CITY_SCREEN_CONTRACT.official_urban_records}`}
          hint="Safe matches of official urban records onto the current polygon export."
          testId="population-matches"
        />
        <Metric
          label={`${lens.label} rank in Llanaditas`}
          value={llanaditasRank ? `#${llanaditasRank}` : '—'}
        />
      </div>

      <div className="screening-list" role="list" data-testid="city-top-list">
        {top.map((feature) => {
          const properties = feature.properties;
          const rank = numeric(properties[lens.rankField]);
          const active = Number(selectedBarrio?.OBJECTID) === Number(properties.OBJECTID);
          return (
            <button
              key={properties.OBJECTID}
              type="button"
              className={active ? 'screening-row active' : 'screening-row'}
              data-testid="screening-row"
              data-rank={rank}
              onClick={() => onSelectBarrio?.(properties)}
            >
              <b>#{rank}</b>
              <span>
                {properties.BARRIO}
                <i>{properties.comuna_name ? properties.comuna_name : 'Special / unmatched polygon'}</i>
              </span>
              <em>{lensSignal(properties, state.cityLens)}</em>
            </button>
          );
        })}
      </div>

      <p className="hint" role="note">
        Selecting another barrio highlights it on the city map. Detailed building-level analysis is
        available only for {BRAND.provingGround}.
      </p>

      <button
        type="button"
        className="flow-tertiary"
        data-testid="run-guided-demo"
        onClick={onLoadExample}
      >
        Load completed example
      </button>
    </StepShell>
  );
}
