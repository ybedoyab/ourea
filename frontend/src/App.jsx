import { useCallback, useMemo, useState } from 'react';
import { CityPanel } from './components/CityPanel.jsx';
import { MapLegend } from './components/MapLegend.jsx';
import { SandboxPanel } from './components/SandboxPanel.jsx';
import { TopBar } from './components/TopBar.jsx';
import { OureaLogo } from './components/OureaLogo.jsx';
import { BRAND } from './config/brand.js';
import { buildDecisionPackage, downloadDecisionPackage } from './domain/decisionPackage.js';
import { useOureaData } from './hooks/useOureaData.js';
import { useOureaMap } from './hooks/useOureaMap.js';
import { usePortfolioWorkspace } from './hooks/usePortfolioWorkspace.js';

export default function App() {
  const { data, loadError } = useOureaData();
  const [scope, setScope] = useState('city');
  const [cityLens, setCityLens] = useState('balanced');
  const [selectedBarrio, setSelectedBarrio] = useState(null);
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [selectedType, setSelectedType] = useState('rwh');
  const [layerState, setLayerState] = useState({
    hazard: true,
    cells: true,
    roads: true,
  });

  const onSelectCell = useCallback(setSelectedCellId, []);
  const onSelectBarrio = useCallback(setSelectedBarrio, []);

  const workspace = usePortfolioWorkspace({
    data,
    selectedCellId,
    selectedType,
  });

  const { mapNode } = useOureaMap({
    data,
    context: workspace.context,
    scope,
    cityLens,
    selectedBarrio,
    selectedCellId,
    layerState,
    activePlan: workspace.activePlan,
    scenario: workspace.scenario,
    onSelectCell,
    onSelectBarrio,
  });

  const selectedCell = useMemo(
    () =>
      data?.cells.features.find(
        (feature) => Number(feature.properties.cell_id) === Number(selectedCellId),
      )?.properties ?? null,
    [data, selectedCellId],
  );

  const llanaditas = useMemo(
    () =>
      data?.screening.features.find((feature) =>
        String(feature.properties.BARRIO ?? '').toUpperCase().includes('LLANADITAS'),
      ) ?? null,
    [data],
  );

  function exportDecisionPackage() {
    if (!data || !workspace.metrics || !workspace.baseline) return;
    downloadDecisionPackage(
      buildDecisionPackage({
        scenario: workspace.scenario,
        budgetCredits: workspace.budgetCredits,
        view: workspace.view,
        cityLens,
        selectedAiProfileId: workspace.selectedAiProfileId,
        projects: workspace.activePlan,
        metrics: workspace.metrics,
        baseline: workspace.baseline,
        monteCarlo: workspace.monteCarlo,
        frontier: workspace.frontier,
        aiDiagnostics: workspace.view === 'ai' ? workspace.aiDiagnostics : null,
        alternatives: workspace.alternatives,
        stability: workspace.stability,
        pareto: workspace.pareto,
        summary: data.summary,
        evidence: data.evidence,
        community: workspace.communityAssessment,
        benchmark: workspace.benchmark,
        breakage: workspace.breakage,
        planAlignment: data.planAlignment,
      }),
    );
  }

  if (loadError) throw loadError;

  return (
    <div className="app">
      <div ref={mapNode} className="map" />

      {!data && (
        <div className="loading">
          <OureaLogo />
          <b>{BRAND.name}</b>
          <span>Preparing the Medellín decision model…</span>
        </div>
      )}

      <TopBar
        scope={scope}
        onScopeChange={setScope}
        view={workspace.view}
        onViewChange={workspace.changeView}
        userCost={workspace.userCost}
        aiCost={workspace.aiCost}
        aiProfileLabel={workspace.aiDiagnostics?.profile?.label}
      />

      <MapLegend scope={scope} cityLens={cityLens} />

      <aside className="panel">
        <div className="eyebrow">
          {BRAND.event} · {BRAND.expansion}
        </div>

        {scope === 'city' ? (
          <CityPanel
            screening={data?.screening}
            selectedBarrio={selectedBarrio}
            llanaditas={llanaditas}
            cityLens={cityLens}
            onCityLensChange={setCityLens}
            onSelectBarrio={setSelectedBarrio}
            onOpenSandbox={() => setScope('sandbox')}
          />
        ) : (
          <SandboxPanel
            scenario={workspace.scenario}
            onScenarioChange={workspace.setScenario}
            summary={data?.summary}
            metrics={workspace.metrics}
            baseline={workspace.baseline}
            monteCarlo={workspace.monteCarlo}
            capturedVolumeM3={workspace.capturedVolumeM3}
            budgetCredits={workspace.budgetCredits}
            onBudgetChange={workspace.setBudgetCredits}
            selectedType={selectedType}
            onSelectType={setSelectedType}
            selectedCell={selectedCell}
            cells={data?.cells}
            selectedCellId={selectedCellId}
            onSelectCell={setSelectedCellId}
            userPlan={workspace.userPlan}
            userCost={workspace.userCost}
            canAddSelected={workspace.canAddSelected}
            onAddSelected={workspace.addSelectedIntervention}
            onRemoveUserProject={workspace.removeUserProject}
            onClearUser={workspace.clearUserPlan}
            aiPlan={workspace.aiPlan}
            aiDiagnostics={workspace.aiDiagnostics}
            alternatives={workspace.alternatives}
            alternativeBusy={workspace.alternativeBusy}
            alternativeError={workspace.alternativeError}
            selectedAiProfileId={workspace.selectedAiProfileId}
            onGenerateAlternatives={workspace.generateAlternatives}
            onSelectAlternative={workspace.selectAlternative}
            frontier={workspace.frontier}
            frontierBusy={workspace.frontierBusy}
            frontierError={workspace.frontierError}
            onAnalyzeFrontier={workspace.analyzeFrontier}
            onExportDecisionPackage={exportDecisionPackage}
            stability={workspace.stability}
            stabilityBusy={workspace.stabilityBusy}
            stabilityError={workspace.stabilityError}
            onAnalyzeStability={workspace.analyzeStability}
            pareto={workspace.pareto}
            paretoBusy={workspace.paretoBusy}
            paretoError={workspace.paretoError}
            onAnalyzePareto={workspace.analyzePareto}
            evidence={data?.evidence}
            replay={data?.replay}
            replayContract={data?.replayContract}
            communityAssessment={workspace.communityAssessment}
            activePlan={workspace.activePlan}
            onRecordCommunityEvidence={workspace.upsertSessionCommunityRecord}
            planAlignment={data?.planAlignment}
            benchmark={workspace.benchmark}
            breakage={workspace.breakage}
            benchmarkBusy={workspace.benchmarkBusy}
            benchmarkError={workspace.benchmarkError}
            onAnalyzeBenchmark={workspace.analyzeBenchmark}
            layerState={layerState}
            onToggleLayer={(key) =>
              setLayerState((state) => ({
                ...state,
                [key]: !state[key],
              }))
            }
          />
        )}

        <footer>
          {BRAND.name} · {BRAND.expansion}. Decision support for accountable city choices — not a
          substitute for engineering design. SIATA historical rainfall remains the calibration
          bridge.
        </footer>
      </aside>
    </div>
  );
}
