import { BRAND } from '../config/brand.js';
import { CommunitySafeguardsPanel } from './CommunitySafeguardsPanel.jsx';
import { DecisionAnalysis } from './DecisionAnalysis.jsx';
import { EvidencePanel } from './EvidencePanel.jsx';
import { LayerControls } from './LayerControls.jsx';
import { PlanAlignmentPanel } from './PlanAlignmentPanel.jsx';
import { PortfolioBuilder } from './PortfolioBuilder.jsx';
import { ClimateContextPanel } from './ClimateContextPanel.jsx';
import { ScenarioControls } from './ScenarioControls.jsx';
import { SectionHeading } from './SectionHeading.jsx';

export function SandboxPanel({
  scenario,
  onScenarioChange,
  summary,
  metrics,
  baseline,
  monteCarlo,
  capturedVolumeM3,
  budgetCredits,
  onBudgetChange,
  selectedType,
  onSelectType,
  selectedCell,
  cells,
  selectedCellId,
  onSelectCell,
  userPlan,
  userCost,
  canAddSelected,
  onAddSelected,
  onRemoveUserProject,
  onClearUser,
  aiPlan,
  aiDiagnostics,
  alternatives,
  alternativeBusy,
  alternativeError,
  selectedAiProfileId,
  onGenerateAlternatives,
  onSelectAlternative,
  frontier,
  frontierBusy,
  frontierError,
  onAnalyzeFrontier,
  onExportDecisionPackage,
  stability,
  stabilityBusy,
  stabilityError,
  onAnalyzeStability,
  pareto,
  paretoBusy,
  paretoError,
  onAnalyzePareto,
  evidence,
  climate,
  onSelectClimatePreset,
  communityAssessment,
  activePlan,
  onRecordCommunityEvidence,
  planAlignment,
  benchmark,
  breakage,
  benchmarkBusy,
  benchmarkError,
  onAnalyzeBenchmark,
  layerState,
  onToggleLayer,
}) {
  return (
    <>
      <p className="eyebrow">{BRAND.event} · hillside proving ground</p>
      <h1>From climate risk to robust action.</h1>
      <p className="lede">
        Compare physical adaptation portfolios across observed rainfall contexts, budgets and
        transparent public-policy priorities.
      </p>

      <section className="proving-ground-strip">
        <SectionHeading step={2} title={BRAND.provingGround}>
          {BRAND.provingGroundRole} — city screening in, high-resolution action testing here.
        </SectionHeading>
        <div className="fact-strip">
          <span><small>Buildings</small><b>{summary?.buildings?.toLocaleString('en-US') ?? '1,588'}</b></span>
          <span><small>People proxy</small><b>~{summary?.population_proxy?.toLocaleString('en-US') ?? '4,057'}</b></span>
          <span><small>High hazard</small><b>{summary?.high_hazard_buildings?.toLocaleString('en-US') ?? '1,445'}</b></span>
          <span><small>Median slope</small><b>{summary?.median_slope_deg ?? 25.4}°</b></span>
        </div>
      </section>

      <ClimateContextPanel
        climate={climate}
        scenario={scenario}
        onSelectPreset={onSelectClimatePreset}
      />

      <ScenarioControls
        scenario={scenario}
        onScenarioChange={onScenarioChange}
        climate={climate}
        summary={summary}
        metrics={metrics}
      />

      <PortfolioBuilder
        budgetCredits={budgetCredits}
        onBudgetChange={onBudgetChange}
        selectedType={selectedType}
        onSelectType={onSelectType}
        selectedCell={selectedCell}
        cells={cells}
        selectedCellId={selectedCellId}
        onSelectCell={onSelectCell}
        userPlan={userPlan}
        userCost={userCost}
        canAddSelected={canAddSelected}
        onAddSelected={onAddSelected}
        onRemoveUserProject={onRemoveUserProject}
        onClearUser={onClearUser}
        aiPlan={aiPlan}
        aiDiagnostics={aiDiagnostics}
        alternatives={alternatives}
        alternativeBusy={alternativeBusy}
        alternativeError={alternativeError}
        selectedAiProfileId={selectedAiProfileId}
        onGenerateAlternatives={onGenerateAlternatives}
        onSelectAlternative={onSelectAlternative}
        stability={stability}
      />

      <DecisionAnalysis
        baseline={baseline}
        metrics={metrics}
        monteCarlo={monteCarlo}
        capturedVolumeM3={capturedVolumeM3}
        frontier={frontier}
        frontierBusy={frontierBusy}
        frontierError={frontierError}
        budgetCredits={budgetCredits}
        onAnalyzeFrontier={onAnalyzeFrontier}
        onExport={onExportDecisionPackage}
        canExport={Boolean(metrics)}
        stability={stability}
        stabilityBusy={stabilityBusy}
        stabilityError={stabilityError}
        onAnalyzeStability={onAnalyzeStability}
        pareto={pareto}
        paretoBusy={paretoBusy}
        paretoError={paretoError}
        onAnalyzePareto={onAnalyzePareto}
        activePolicyLabel={aiDiagnostics?.profile?.label}
        benchmark={benchmark}
        breakage={breakage}
        benchmarkBusy={benchmarkBusy}
        benchmarkError={benchmarkError}
        onAnalyzeBenchmark={onAnalyzeBenchmark}
        cells={cells}
        activePlan={activePlan}
        rainMm={scenario.rainMm}
      />

      <EvidencePanel evidence={evidence} />
      <CommunitySafeguardsPanel
        assessment={communityAssessment}
        activePlan={activePlan}
        onRecord={onRecordCommunityEvidence}
      />
      <PlanAlignmentPanel alignment={planAlignment} />
      <LayerControls layerState={layerState} onToggleLayer={onToggleLayer} />
    </>
  );
}
