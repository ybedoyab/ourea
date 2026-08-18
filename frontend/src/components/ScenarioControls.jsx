import { MODEL_LIMITS } from '../config/modelConfig.js';
import { Guardrail, SectionHeading } from './SectionHeading.jsx';
import { Metric } from './Metric.jsx';

const HYPOTHETICAL_PRESETS = Object.freeze([
  { label: 'Moderate', rainMm: 60, antecedentWetness: 0.25, note: 'Drier start, lighter storm' },
  { label: 'Wet', rainMm: 95, antecedentWetness: 0.45, note: 'Default development case' },
  { label: 'Severe', rainMm: 140, antecedentWetness: 0.75, note: 'Wet soils, deeper storm' },
]);

export function ScenarioControls({ scenario, onScenarioChange, summary, metrics }) {
  const update = (field, value) => onScenarioChange({ ...scenario, [field]: value });

  return (
    <section>
      <SectionHeading step={3} title="Stress the future">
        Hypothetical development scenarios for comparing portfolios — not SIATA return periods
        or calibrated storm classes.
      </SectionHeading>

      <Guardrail>
        Climate Stress is a development planning index, not landslide probability. The rain and
        wetness terms remain uncalibrated until the official SIATA series is ingested.
      </Guardrail>

      <div className="preset-kicker">Hypothetical development scenarios</div>
      <div className="scenario-presets" role="group" aria-label="Hypothetical development presets">
        {HYPOTHETICAL_PRESETS.map((preset) => {
          const active =
            scenario.rainMm === preset.rainMm &&
            scenario.antecedentWetness === preset.antecedentWetness;
          return (
            <button
              key={preset.label}
              type="button"
              className={active ? 'active' : ''}
              aria-pressed={active}
              onClick={() =>
                onScenarioChange({
                  ...scenario,
                  rainMm: preset.rainMm,
                  antecedentWetness: preset.antecedentWetness,
                })
              }
            >
              <b>{preset.label}</b>
              <span>{preset.rainMm} mm · {Math.round(preset.antecedentWetness * 100)}% wet</span>
            </button>
          );
        })}
      </div>

      <label htmlFor="rain-depth">
        Hypothetical storm depth <b>{scenario.rainMm} mm</b>
      </label>
      <input
        id="rain-depth"
        type="range"
        min="40"
        max="180"
        step="5"
        value={scenario.rainMm}
        onChange={(event) => update('rainMm', Number(event.target.value))}
        aria-valuetext={`${scenario.rainMm} millimeters`}
      />
      <small>Total rainfall depth used by the development climate term.</small>

      <label htmlFor="antecedent-wetness">
        Antecedent wetness <b>{Math.round(scenario.antecedentWetness * 100)}%</b>
      </label>
      <input
        id="antecedent-wetness"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={scenario.antecedentWetness}
        onChange={(event) => update('antecedentWetness', Number(event.target.value))}
        aria-valuetext={`${Math.round(scenario.antecedentWetness * 100)} percent`}
      />
      <small>How wet the hillside is before the storm.</small>

      <label htmlFor="planning-year">
        Planning horizon / maturity <b>Year {scenario.planningYear}</b>
      </label>
      <input
        id="planning-year"
        type="range"
        min="1"
        max="5"
        step="1"
        value={scenario.planningYear}
        onChange={(event) => update('planningYear', Number(event.target.value))}
        aria-valuetext={`Year ${scenario.planningYear}`}
      />
      <small>Restoration only reaches full prior effect after its maturity window.</small>

      <div className="metrics">
        <Metric label="Buildings" value={summary?.buildings?.toLocaleString() ?? '—'} />
        <Metric
          label="Population proxy"
          value={summary?.population_proxy?.toLocaleString() ?? '—'}
          hint="DANE census-block planning proxy allocated to buildings, not a current household count."
        />
        <Metric
          label={`Residual stress ≥ ${MODEL_LIMITS.stressThreshold}`}
          value={metrics?.buildingsAboveThreshold?.toLocaleString() ?? '—'}
        />
        <Metric
          label={`People proxy in ≥ ${MODEL_LIMITS.stressThreshold}`}
          value={metrics ? Math.round(metrics.populationAboveThreshold).toLocaleString() : '—'}
        />
      </div>
    </section>
  );
}
