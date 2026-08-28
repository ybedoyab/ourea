import { useEffect, useMemo, useRef } from 'react';
import { BRAND } from '../config/brand.js';
import { PRIORITY_CARDS, DECISION_ENGINE_COPY } from '../config/uiCopy.js';
import { CITY_SCREEN_CONTRACT, countSafePopulationMatches } from '../domain/cityScreen.js';
import { numeric } from '../domain/numeric.js';
import { ClimateContextPanel } from '../components/ClimateContextPanel.jsx';
import { ScenarioControls } from '../components/ScenarioControls.jsx';
import { EvidencePanel } from '../components/EvidencePanel.jsx';
import { CommunitySafeguardsPanel } from '../components/CommunitySafeguardsPanel.jsx';
import { PlanAlignmentPanel } from '../components/PlanAlignmentPanel.jsx';
import { AlternativePortfolios } from '../components/AlternativePortfolios.jsx';
import { BenchmarkPanel } from '../components/BenchmarkPanel.jsx';
import { StabilityPanel } from '../components/StabilityPanel.jsx';
import { ParetoPanel } from '../components/ParetoPanel.jsx';
import { TradeoffChart } from '../components/TradeoffChart.jsx';
import { FlowStepper } from './FlowStepper.jsx';
import { FlowDrawer, FlowModal } from './FlowOverlay.jsx';
import { AreaStep } from './steps/AreaStep.jsx';
import { ConditionsStep } from './steps/ConditionsStep.jsx';
import { PrioritiesStep } from './steps/PrioritiesStep.jsx';
import { PortfolioStep } from './steps/PortfolioStep.jsx';
import { ReviewStep } from './steps/ReviewStep.jsx';
import { SafeguardsStep } from './steps/SafeguardsStep.jsx';
import { ExploreWorkspace } from './ExploreWorkspace.jsx';
import { canAdvance } from './flowGuards.js';

const ADVANCED_TABS = [
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'breakage', label: 'What could change' },
  { id: 'frontier', label: 'Budget frontier' },
  { id: 'stability', label: 'Selection stability' },
  { id: 'tradeoffs', label: 'Trade-offs' },
];

export function DecisionFlow({
  state,
  dispatch,
  data,
  workspace,
  selectedBarrio,
  llanaditas,
  selectedType,
  selectedCell,
  selectedCellId,
  onSelectType,
  onSelectCell,
  onSelectBarrio,
  onExport,
}) {
  const pendingKind = state.pendingKind;
  const sawBusy = useRef(false);
  const analyzeBenchmarkRef = useRef(workspace.analyzeBenchmark);
  analyzeBenchmarkRef.current = workspace.analyzeBenchmark;

  useEffect(() => {
    if (!state.pendingGeneration) {
      sawBusy.current = false;
      return undefined;
    }
    if (workspace.alternativeError) {
      dispatch({ type: 'GENERATION_FAILED', message: workspace.alternativeError });
      return undefined;
    }
    if (workspace.alternativeBusy || workspace.benchmarkBusy) {
      sawBusy.current = true;
      return undefined;
    }
    if (!sawBusy.current) return undefined;
    if (!workspace.aiPlan.length) return undefined;

    const kind = pendingKind ?? 'example';
    if (kind === 'generate' && !workspace.benchmark && !workspace.benchmarkError) {
      analyzeBenchmarkRef.current();
      return undefined;
    }

    dispatch({
      type: 'GENERATION_COMPLETED',
      example: kind === 'example',
      profileId: workspace.selectedAiProfileId,
      message: kind === 'example' ? 'Example portfolio loaded' : 'Recommendation ready',
    });
    return undefined;
  }, [
    state.pendingGeneration,
    pendingKind,
    workspace.alternativeBusy,
    workspace.benchmarkBusy,
    workspace.aiPlan.length,
    workspace.benchmark,
    workspace.benchmarkError,
    workspace.alternativeError,
    workspace.selectedAiProfileId,
    dispatch,
  ]);

  const whyContent = useMemo(() => {
    const lens = state.cityLens;
    const rankField = lens === 'exposure' ? 'rank_exposure' : lens === 'equity' ? 'rank_equity' : 'rank_balanced';
    const rank = numeric(llanaditas?.properties?.[rankField]);
    const matches = countSafePopulationMatches(data?.screening);
    return { rank, matches };
  }, [data, llanaditas, state.cityLens]);

  function analyzeLlanaditas() {
    if (llanaditas) onSelectBarrio(llanaditas.properties);
    dispatch({ type: 'SELECT_AREA', areaId: 'llanaditas' });
  }

  function loadExample() {
    if (llanaditas) onSelectBarrio(llanaditas.properties);
    dispatch({ type: 'SET_AREA', areaId: 'llanaditas' });
    dispatch({ type: 'SET_LENS', cityLens: 'balanced' });
    dispatch({ type: 'GENERATION_STARTED', kind: 'example' });
    workspace.runGuidedDemo();
  }

  function generateRecommendation() {
    dispatch({ type: 'GENERATION_STARTED', kind: 'generate' });
    workspace.generateAlternatives(state.profileId);
  }

  function onBudgetChange(value) {
    workspace.setBudgetCredits(value);
    dispatch({ type: 'SET_CONDITIONS' });
  }

  function onPreset(preset) {
    workspace.applyClimatePreset(preset);
    dispatch({ type: 'SET_CONDITIONS' });
  }

  function onPriority(profileId) {
    dispatch({ type: 'SET_PRIORITY', profileId });
  }

  const summaries = state.step !== 'area' ? (
    <div className="step-summaries" data-testid="step-summaries">
      {state.areaId && state.step !== 'area' && (
        <button type="button" className="step-summary" onClick={() => dispatch({ type: 'GO_TO_COMPLETED_STEP', step: 'area' })}>
          <span>Area</span><b>{BRAND.provingGround}</b>
        </button>
      )}
      {['conditions', 'priorities', 'portfolio', 'review', 'safeguards'].includes(state.step) && state.step !== 'conditions' && (
        <button type="button" className="step-summary" onClick={() => dispatch({ type: 'GO_TO_COMPLETED_STEP', step: 'conditions' })}>
          <span>Conditions</span>
          <b>{workspace.budgetCredits} cr · {workspace.scenario?.presetId?.replaceAll('_', ' ') ?? 'planning rainfall'}</b>
        </button>
      )}
      {['priorities', 'portfolio', 'review', 'safeguards'].includes(state.step) && state.step !== 'priorities' && (
        <button type="button" className="step-summary" onClick={() => dispatch({ type: 'GO_TO_COMPLETED_STEP', step: 'priorities' })}>
          <span>Priority</span><b>{PRIORITY_CARDS[state.profileId]?.name}</b>
        </button>
      )}
    </div>
  ) : null;

  return (
    <aside className={`panel decision-panel${state.sheetExpanded ? ' is-expanded' : ''}${state.mode === 'explore' ? ' is-explore' : ''}`} data-testid="decision-panel">
      <button
        type="button"
        className="sheet-handle"
        data-testid="sheet-handle"
        onClick={() => dispatch({ type: 'TOGGLE_SHEET' })}
      >
        {state.sheetExpanded ? 'Collapse step' : 'Expand step'}
      </button>
      <div className="visually-hidden" aria-live="polite" data-testid="flow-announcer">
        {state.announcement}
      </div>
      {state.mode === 'explore' ? (
        <ExploreWorkspace
          state={state}
          onTab={(tab) => dispatch({ type: 'SET_EXPLORE_TAB', tab })}
          data={data}
          workspace={workspace}
          selectedType={selectedType}
          onSelectType={onSelectType}
          selectedCell={selectedCell}
          selectedCellId={selectedCellId}
          onSelectCell={onSelectCell}
          onExport={onExport}
          onInvalidate={() => dispatch({ type: 'SET_CONDITIONS' })}
        />
      ) : (
        <>
          <FlowStepper
            state={state}
            onGoToStep={(step) => dispatch({ type: 'GO_TO_COMPLETED_STEP', step })}
          />
          {summaries}
      {state.step === 'area' && (
        <AreaStep
          state={state}
          screening={data?.screening}
          selectedBarrio={selectedBarrio}
          llanaditas={llanaditas}
          onLensChange={(cityLens) => dispatch({ type: 'SET_LENS', cityLens })}
          onSelectBarrio={onSelectBarrio}
          onAnalyze={analyzeLlanaditas}
          onSeeWhy={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'why-area' })}
          onLoadExample={loadExample}
        />
      )}
      {state.step === 'conditions' && (
        <ConditionsStep
          state={state}
          climate={data?.climateContext}
          scenario={workspace.scenario}
          budgetCredits={workspace.budgetCredits}
          onSelectPreset={onPreset}
          onBudgetChange={onBudgetChange}
          onHowCalculated={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'method' })}
          onAdjustManually={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'explore-controls' })}
          onBack={() => dispatch({ type: 'GO_BACK' })}
          onContinue={() => canAdvance(state, workspace) && dispatch({ type: 'CONFIRM_CONDITIONS' })}
          continueDisabled={!canAdvance(state, workspace)}
        />
      )}
      {state.step === 'priorities' && (
        <PrioritiesStep
          state={state}
          onSelect={onPriority}
          onHow={(id) => dispatch({ type: 'OPEN_DRAWER', drawer: `priority-${id}` })}
          onBack={() => dispatch({ type: 'GO_BACK' })}
          onContinue={() => dispatch({ type: 'CONFIRM_PRIORITY', profileId: state.profileId })}
        />
      )}
      {state.step === 'portfolio' && (
        <PortfolioStep
          state={state}
          workspace={workspace}
          selectedType={selectedType}
          selectedCell={selectedCell}
          selectedCellId={selectedCellId}
          cells={data?.cells}
          onSelectType={onSelectType}
          onSelectCell={onSelectCell}
          onChooseRecommended={() => dispatch({ type: 'CHOOSE_PORTFOLIO_MODE', mode: 'recommended' })}
          onChooseManual={() => dispatch({ type: 'CHOOSE_PORTFOLIO_MODE', mode: 'manual' })}
          onGenerate={generateRecommendation}
          onAdd={workspace.addSelectedIntervention}
          onRemove={workspace.removeUserProject}
          onBack={() => {
            if (state.manualOpen) dispatch({ type: 'CHOOSE_PORTFOLIO_MODE', mode: 'recommended' });
            else dispatch({ type: 'GO_BACK' });
          }}
          onContinueManual={() => workspace.userPlan.length && dispatch({ type: 'CONFIRM_MANUAL' })}
        />
      )}
      {state.step === 'review' && (
        <ReviewStep
          state={state}
          workspace={workspace}
          cells={data?.cells}
          climate={data?.climateContext}
          onCompare={workspace.changeView}
          onAdvanced={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'advanced' })}
          onRefresh={generateRecommendation}
          onBack={() => dispatch({ type: 'GO_BACK' })}
          onContinue={() => dispatch({ type: 'CONFIRM_REVIEW' })}
        />
      )}
      {state.step === 'safeguards' && (
        <SafeguardsStep
          state={state}
          evidence={data?.evidence}
          communityAssessment={workspace.communityAssessment}
          planAlignment={data?.planAlignment}
          canExport={Boolean(workspace.metrics)}
          onEvidence={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'evidence' })}
          onCommunity={() => dispatch({ type: 'OPEN_MODAL', modal: 'community' })}
          onAlignment={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'alignment' })}
          onExport={onExport}
          onBack={() => dispatch({ type: 'GO_BACK' })}
        />
      )}
        </>
      )}
      <FlowDrawer
        id="why-area"
        title="Why Llanaditas"
        open={state.drawer === 'why-area'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
      >
        <p>
          Llanaditas ranks #{whyContent.rank ?? '—'} under the active city lens. It is the proving
          ground because detailed buildings, terrain and access exist here, not because it is #1.
        </p>
        <p>
          Population matches: {whyContent.matches}/{CITY_SCREEN_CONTRACT.official_urban_records} official
          urban records. Special unmatched polygons stay out of rankings.
        </p>
      </FlowDrawer>

      <FlowDrawer
        id="method"
        title="How this was calculated"
        open={state.drawer === 'method'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        testId="drawer-method"
      >
        <ClimateContextPanel
          climate={data?.climateContext}
          scenario={workspace.scenario}
          onSelectPreset={onPreset}
          showPresets={false}
        />
      </FlowDrawer>

      <FlowDrawer
        id="explore-controls"
        title="Adjust rainfall manually"
        open={state.drawer === 'explore-controls'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
      >
        <ScenarioControls
          scenario={workspace.scenario}
          onScenarioChange={(next) => {
            workspace.setScenario(next);
            dispatch({ type: 'SET_CONDITIONS' });
          }}
          climate={data?.climateContext}
          summary={data?.summary}
          metrics={workspace.metrics}
        />
      </FlowDrawer>

      {Object.keys(PRIORITY_CARDS).map((id) => (
        <FlowDrawer
          key={id}
          id={`priority-${id}`}
          title={PRIORITY_CARDS[id].name}
          open={state.drawer === `priority-${id}`}
          onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        >
          <p>{PRIORITY_CARDS[id].how}</p>
        </FlowDrawer>
      ))}

      <FlowDrawer
        id="advanced"
        title="Advanced analysis"
        open={state.drawer === 'advanced'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        testId="drawer-advanced"
      >
        <div className="explore-tabs" role="tablist">
          {ADVANCED_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={state.advancedTab === tab.id ? 'active' : ''}
              data-testid={`advanced-tab-${tab.id}`}
              onClick={() => {
                dispatch({ type: 'SET_ADVANCED_TAB', tab: tab.id });
                if (tab.id === 'frontier') workspace.analyzeFrontier();
                if (tab.id === 'stability') workspace.analyzeStability();
                if (tab.id === 'tradeoffs') workspace.analyzePareto();
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {state.advancedTab === 'benchmark' && (
          <>
            <AlternativePortfolios
              alternatives={workspace.alternatives}
              selectedProfileId={workspace.selectedAiProfileId}
              busy={workspace.alternativeBusy}
              error={workspace.alternativeError}
              onGenerate={generateRecommendation}
              onSelect={workspace.selectAlternative}
              showEngine={false}
              showGenerate={false}
            />
            <BenchmarkPanel
              benchmark={workspace.benchmark}
              breakage={workspace.breakage}
              busy={workspace.benchmarkBusy}
              error={workspace.benchmarkError}
              onAnalyze={workspace.analyzeBenchmark}
            />
          </>
        )}
        {state.advancedTab === 'breakage' && workspace.breakage && (
          <BenchmarkPanel
            benchmark={workspace.benchmark}
            breakage={workspace.breakage}
            busy={workspace.benchmarkBusy}
            error={workspace.benchmarkError}
            onAnalyze={workspace.analyzeBenchmark}
          />
        )}
        {state.advancedTab === 'frontier' && (
          <>
            {workspace.frontier?.length > 0 && (
              <>
                <TradeoffChart frontier={workspace.frontier} activeBudget={workspace.budgetCredits} />
                <div className="frontier-table">
                  {workspace.frontier.map((point) => (
                    <div
                      key={point.budgetCredits}
                      className={
                        Math.abs(point.budgetCredits - workspace.budgetCredits) < 0.5
                          ? 'frontier-row active'
                          : 'frontier-row'
                      }
                    >
                      <b>{point.budgetCredits} cr</b>
                      <span>{point.projectCount} projects</span>
                      <span>median {point.median.toFixed(1)}</span>
                      <span>P10 {point.p10.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button type="button" data-testid="analyze-frontier" onClick={workspace.analyzeFrontier}>
              {workspace.frontierBusy ? 'Analyzing…' : workspace.frontier?.length ? 'Recompute frontier' : 'Analyze frontier'}
            </button>
          </>
        )}
        {state.advancedTab === 'stability' && (
          <StabilityPanel
            stability={workspace.stability}
            busy={workspace.stabilityBusy}
            error={workspace.stabilityError}
            onAnalyze={workspace.analyzeStability}
          />
        )}
        {state.advancedTab === 'tradeoffs' && (
          <ParetoPanel
            pareto={workspace.pareto}
            busy={workspace.paretoBusy}
            error={workspace.paretoError}
            onAnalyze={workspace.analyzePareto}
          />
        )}
      </FlowDrawer>

      <FlowDrawer
        id="evidence"
        title="Evidence and methods"
        open={state.drawer === 'evidence'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        testId="drawer-evidence"
      >
        <EvidencePanel evidence={data?.evidence} />
        <ClimateContextPanel
          climate={data?.climateContext}
          scenario={workspace.scenario}
          onSelectPreset={onPreset}
          showPresets={false}
        />
      </FlowDrawer>

      <FlowDrawer
        id="alignment"
        title="Local evidence"
        open={state.drawer === 'alignment'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        testId="drawer-alignment"
      >
        <PlanAlignmentPanel alignment={data?.planAlignment} />
      </FlowDrawer>

      <FlowDrawer
        id="help"
        title="How to decide"
        open={state.drawer === 'help'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
      >
        <ol>
          <li>Choose the city area. Detailed analysis is Llanaditas.</li>
          <li>Set rainfall context and budget.</li>
          <li>Pick what the portfolio should prioritize.</li>
          <li>Generate a recommendation or build your own.</li>
          <li>Read whether it holds up under uncertainty.</li>
          <li>Check safeguards and export the package.</li>
        </ol>
      </FlowDrawer>

      <FlowDrawer
        id="about"
        title="About Ourea"
        open={state.drawer === 'about'}
        onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
      >
        <p>
          {BRAND.name} · {BRAND.expansion}. Decision support for accountable city choices — not a
          substitute for engineering design. Rainfall contexts are CHIRPS v3 Final gridded
          observations, not real-time forecasts.
        </p>
        <p>
          {DECISION_ENGINE_COPY.explanation} {DECISION_ENGINE_COPY.milpNote}
        </p>
      </FlowDrawer>

      <FlowModal
        id="community"
        title="Record community evidence"
        open={state.modal === 'community'}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        testId="modal-community"
      >
        <CommunitySafeguardsPanel
          assessment={workspace.communityAssessment}
          activePlan={workspace.activePlan}
          onRecord={workspace.upsertSessionCommunityRecord}
        />
      </FlowModal>
    </aside>
  );
}
