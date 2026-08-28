import { observationalPresets } from '../../domain/climateScenarios.js';
import { FlowActions } from '../FlowActions.jsx';
import { StepShell } from '../StepShell.jsx';

function mm(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} mm` : '—';
}

const GUIDED_PRESETS = ['typical_wet', 'high_rainfall', 'extreme_observed'];

export function ConditionsStep({
  state,
  climate,
  scenario,
  budgetCredits,
  onSelectPreset,
  onBudgetChange,
  onHowCalculated,
  onAdjustManually,
  onBack,
  onContinue,
  continueDisabled = false,
}) {
  const presets = observationalPresets(climate).filter((preset) => GUIDED_PRESETS.includes(preset.id));

  return (
    <StepShell
      state={state}
      actions={(
        <FlowActions
          onBack={onBack}
          onContinue={onContinue}
          continueDisabled={continueDisabled}
          extra={(
            <button type="button" className="flow-tertiary" data-testid="how-calculated" onClick={onHowCalculated}>
              How was this calculated?
            </button>
          )}
        />
      )}
    >
      <div className="scenario-presets" role="group" aria-label="Observed rainfall context presets">
        {presets.map((preset) => {
          const active = scenario?.presetId === preset.id;
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
            </button>
          );
        })}
      </div>

      <label htmlFor="budget-credits">
        Budget <b>{budgetCredits} planning credits</b>
      </label>
      <input
        id="budget-credits"
        type="range"
        min="4"
        max="20"
        step="1"
        value={budgetCredits}
        onChange={(event) => onBudgetChange(Number(event.target.value))}
        aria-valuetext={`${budgetCredits} planning credits`}
      />
      <p className="hint">
        Planning credits are relative budget units for comparing portfolios. They are not COP.
      </p>

      <button
        type="button"
        className="flow-tertiary"
        data-testid="adjust-manually"
        onClick={onAdjustManually}
      >
        Adjust manually
      </button>
    </StepShell>
  );
}
