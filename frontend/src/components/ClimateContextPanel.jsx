import { observationalPresets } from '../domain/climateScenarios.js';
import { SectionHeading } from './SectionHeading.jsx';

const SOURCE_LABELS = Object.freeze({
  'https://www.chc.ucsb.edu/data/chirps': 'CHC CHIRPS landing page',
  'https://data.chc.ucsb.edu/products/CHIRPS/v3.0/': 'CHIRPS v3.0 data archive',
  'https://data.chc.ucsb.edu/products/CHIRPS/v3.0/README-CHIRPSv3.0.txt': 'CHIRPS v3.0 README',
  'https://data.chc.ucsb.edu/products/CHIRPS/v3.0/pentads/latam/tifs/': 'CHIRPS v3.0 Latin America pentads',
});

function mm(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} mm` : '—';
}

function periodLabel(period) {
  return period?.label ?? `${period?.start ?? '—'} – ${period?.end ?? '—'}`;
}

export function ClimateContextPanel({
  climate,
  scenario,
  onSelectPreset,
  showPresets = true,
}) {
  const presets = observationalPresets(climate);
  if (!climate) {
    return null;
  }

  const activeId = scenario?.presetId;
  const landing = climate.doi || climate.source_urls?.[0];

  return (
    <section data-testid="climate-context-panel">
      <SectionHeading title="Observed climate context">
        Planning rainfall contexts are anchored in the CHIRPS v3 Final gridded record for the
        Llanaditas / upper Comuna 8 cell.
      </SectionHeading>

      <p className="hint" role="note">
        Ourea evaluates portfolio performance across observed and stress-tested rainfall contexts.
        It supports planning decisions; it does not issue real-time forecasts.
      </p>

      <div className="climate-facts" data-testid="climate-facts">
        <span><small>Source</small><b>{climate.source_name}</b></span>
        <span><small>Climatology</small><b>{periodLabel(climate.climatology_period)}</b></span>
        <span><small>Spatial resolution</small><b>{climate.spatial_resolution}</b></span>
        <span><small>Temporal resolution</small><b>{climate.temporal_resolution}</b></span>
      </div>

      {showPresets && (
      <div className="scenario-presets" role="group" aria-label="Observed rainfall context presets">
        {presets.map((preset) => {
          const active = activeId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={active ? 'active' : ''}
              data-testid={`climate-preset-${preset.id}`}
              aria-pressed={active}
              onClick={() => onSelectPreset(preset)}
            >
              <b>{preset.label}</b>
              <span>
                {preset.accumulation_window_days}-day {mm(preset.precipitation_mm)} · P{preset.percentile}
              </span>
              <small>
                {preset.climatology_period} · {preset.source_name}
              </small>
            </button>
          );
        })}
      </div>
      )}

      <p>
        <a
          href={landing}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="climate-source-link"
        >
          CHIRPS v3 scientific source
        </a>
      </p>

      <details className="method-disclosure" data-testid="climate-method">
        <summary>Method and appropriate use</summary>
        <ul>
          <li>{climate.method?.product}</li>
          <li>{climate.method?.extract}</li>
          <li>{climate.method?.daily_allocation}</li>
          <li>{climate.method?.percentiles}</li>
          <li>{climate.method?.preset_mapping}</li>
        </ul>
        <p><b>Appropriate uses</b></p>
        <ul>
          {(climate.appropriate_uses ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p><b>Scope</b></p>
        <ul>
          {(climate.limitations ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>Sources</p>
        <ul>
          {(climate.source_urls ?? []).map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {SOURCE_LABELS[url] ?? 'CHIRPS documentation'}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
