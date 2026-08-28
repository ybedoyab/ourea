import { rainfallChip } from '../../config/climateCopy.js';
import { DECISION_ENGINE_COPY, PRIORITY_CARDS } from '../../config/uiCopy.js';
import { actionFootprint } from '../../domain/actionFootprint.js';
import { AiDecisionReviewCard } from '../../components/AiDecisionReviewCard.jsx';
import { Metric } from '../../components/Metric.jsx';
import { UncertaintyInterval } from '../../components/UncertaintyInterval.jsx';
import { SegmentedControl } from '../../components/SegmentedControl.jsx';
import { FlowActions } from '../FlowActions.jsx';
import { StepShell } from '../StepShell.jsx';

function robustnessCopy(benchmark) {
  const robust = benchmark?.strategies?.find((item) => item.id === 'ourea_robust');
  const hazard = benchmark?.strategies?.find((item) => item.id === 'hazard_only');
  const deterministic = benchmark?.strategies?.find((item) => item.id === 'deterministic');
  if (!robust || !hazard || !deterministic) {
    return 'Compare this recommendation with hazard-only and one-scenario portfolios under the same budget.';
  }
  if (robust.p10 >= hazard.p10 && robust.p10 >= deterministic.p10) {
    return 'This recommendation keeps a stronger lower-tail benefit than the hazard-only and one-scenario portfolios under the same budget.';
  }
  return 'The lower-tail benefit of this recommendation is compared with hazard-only and one-scenario portfolios under the same budget.';
}

export function ReviewStep({
  state,
  workspace,
  cells,
  climate,
  readiness,
  review,
  onCompare,
  onAdvanced,
  onRefresh,
  onBack,
  onContinue,
}) {
  const profile = PRIORITY_CARDS[state.profileId] ?? PRIORITY_CARDS.balanced;
  const footprint = actionFootprint({
    projects: workspace.activePlan,
    cells,
    rainMm: workspace.scenario?.rainMm,
  });
  const monteCarlo = workspace.monteCarlo;
  const metrics = workspace.metrics;
  const retention = monteCarlo?.median
    ? Math.round((monteCarlo.p10 / monteCarlo.median) * 100)
    : null;
  const combinationCount = workspace.breakage?.scenarioCombinationsBelowThreshold?.length
    ?? workspace.breakage?.breaches?.length
    ?? 0;
  const compareOptions = [
    { id: 'none', label: 'No action', testId: 'view-none' },
    workspace.userPlan.length > 0
      ? { id: 'user', label: 'My plan', testId: 'view-user' }
      : null,
    workspace.aiPlan.length > 0
      ? { id: 'ai', label: 'Ourea', testId: 'view-ai' }
      : null,
  ].filter(Boolean);

  return (
    <StepShell
      state={state}
      actions={(
        <FlowActions
          onBack={onBack}
          onContinue={onContinue}
          continueLabel="Review safeguards"
          continueDisabled={state.recommendationStale || !workspace.activePlan.length}
          continueTestId="review-safeguards"
        />
      )}
    >
      {state.exampleBanner && (
        <p className="flow-banner" role="status" data-testid="example-banner">
          Example portfolio loaded
        </p>
      )}
      {state.recommendationStale ? (
        <div className="flow-banner warning" role="status" data-testid="stale-recommendation">
          <span>Your recommendation needs to be refreshed</span>
          <button type="button" className="primary" data-testid="update-recommendation" onClick={onRefresh}>
            Update recommendation
          </button>
        </div>
      ) : (
        <>
          <div className="review-summary">
            <span><small>Priority</small><b>{profile.name}</b></span>
            <span><small>Budget</small><b>{workspace.budgetCredits} credits</b></span>
            <span><small>Projects</small><b>{workspace.activePlan.length}</b></span>
          </div>

          <div className="action-footprint" data-testid="action-footprint">
            <p>
              These are targeted planning proxies, not people protected or avoided losses.
            </p>
            <div className="metric-group-grid">
              <Metric label="Planning cells targeted" value={footprint.planning_cells_targeted.toLocaleString('en-US')} />
              <Metric label="Cadastral buildings" value={footprint.cadastral_buildings_in_targeted_cells.toLocaleString('en-US')} />
              <Metric label="High-hazard buildings" value={footprint.high_hazard_buildings_in_targeted_cells.toLocaleString('en-US')} />
              <Metric
                label="Population proxy"
                value={`~${Math.round(footprint.population_proxy_in_targeted_cells).toLocaleString('en-US')}`}
              />
              {footprint.rwh_captured_volume_m3 > 0 && (
                <Metric label="RWH captured volume" value={`${footprint.rwh_captured_volume_m3.toFixed(0)} m³`} />
              )}
            </div>
          </div>

          <div className="decision-engine" data-testid="decision-engine">
            <b>{DECISION_ENGINE_COPY.title}</b>
            <ul>
              <li>{DECISION_ENGINE_COPY.eligibleCandidates} eligible intervention-location candidates</li>
              <li>{DECISION_ENGINE_COPY.uncertaintyScenarios} uncertainty scenarios per optimization</li>
              <li>{DECISION_ENGINE_COPY.policyObjectives} transparent policy objectives</li>
              <li>{DECISION_ENGINE_COPY.comparisonFutures} common-random futures for comparison</li>
            </ul>
          </div>

          <div className="review-climate-chip" data-testid="climate-context-panel">
            {rainfallChip(climate, workspace.scenario)}
          </div>

          {metrics && (
            <div className="metrics">
              <Metric label="Expected benefit proxy" value={metrics.benefit.toFixed(1)} />
              {monteCarlo && (
                <>
                  <Metric
                    label="P10"
                    value={monteCarlo.p10.toFixed(1)}
                    hint="Lower-tail planning benefit. In 90% of modeled futures the portfolio retains at least this level."
                  />
                  <Metric label="Median" value={monteCarlo.median.toFixed(1)} />
                  <Metric label="P90" value={monteCarlo.p90.toFixed(1)} />
                </>
              )}
              {retention != null && (
                <Metric label="Downside retention" value={`${retention}%`} />
              )}
            </div>
          )}

          {monteCarlo && (
            <>
              <p className="takeaway">
                In 90% of the modeled futures, the portfolio retains at least this level of planning
                benefit.
              </p>
              <UncertaintyInterval
                p10={monteCarlo.p10}
                median={monteCarlo.median}
                p90={monteCarlo.p90}
                runs={monteCarlo.runs}
              />
            </>
          )}

          <SegmentedControl
            className="map-compare"
            legend="Compare on map"
            value={workspace.view}
            onChange={onCompare}
            options={compareOptions}
          />

          <p className="takeaway" data-testid="robustness-copy">{robustnessCopy(workspace.benchmark)}</p>
          {workspace.breakage && (
            <p className="hint" data-testid="breakage-combination-count">
              {combinationCount} scenario combinations fall below the threshold.
            </p>
          )}

          <button type="button" className="flow-tertiary" data-testid="open-advanced" onClick={onAdvanced}>
            Advanced analysis
          </button>

          {readiness && review && (
            <AiDecisionReviewCard readiness={readiness} review={review} />
          )}
        </>
      )}
    </StepShell>
  );
}
