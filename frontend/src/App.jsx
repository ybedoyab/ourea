import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SCENARIO,
  INTERVENTIONS,
  MODEL_LIMITS,
  MODEL_PARAMETERS,
} from './config/modelConfig.js';
import { CityPanel } from './components/CityPanel.jsx';
import { MapLegend } from './components/MapLegend.jsx';
import { SandboxPanel } from './components/SandboxPanel.jsx';
import { TopBar } from './components/TopBar.jsx';
import { OureaLogo } from './components/OureaLogo.jsx';
import { BRAND } from './config/brand.js';
import {
  buildDecisionPackage,
  downloadDecisionPackage,
} from './domain/decisionPackage.js';
import {
  alternativeById,
  generateAlternativePortfolios,
} from './domain/alternatives.js';
import { budgetRobustnessFrontier } from './domain/frontier.js';
import { capturedRainwaterVolumeM3 } from './domain/interventionModel.js';
import {
  fitPlanToBudget,
  planCostCredits,
} from './domain/optimizer.js';
import { sampledParetoSet } from './domain/pareto.js';
import { portfolioSelectionStability } from './domain/stability.js';
import {
  buildingStressGeoJson,
  createScenarioContext,
  evaluatePortfolio,
  monteCarloPortfolio,
} from './domain/scenarioEngine.js';
import { loadLaderaData } from './services/dataService.js';
import { createLaderaMap } from './services/mapService.js';

const EMPTY_PLAN = Object.freeze([]);
const DEFAULT_AI_PROFILE = 'balanced';

export default function App() {
  const mapNode = useRef(null);
  const mapApiRef = useRef(null);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const [scope, setScope] = useState('city');
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [cityLens, setCityLens] = useState('balanced');
  const [selectedBarrio, setSelectedBarrio] = useState(null);
  const [selectedCellId, setSelectedCellId] = useState(null);

  const [scenario, setScenario] = useState({
    rainMm: DEFAULT_SCENARIO.rainMm,
    antecedentWetness: DEFAULT_SCENARIO.antecedentWetness,
    planningYear: DEFAULT_SCENARIO.planningYear,
  });
  const [budgetCredits, setBudgetCredits] = useState(
    DEFAULT_SCENARIO.budgetCredits,
  );

  const [selectedType, setSelectedType] = useState('rwh');
  const [userPlan, setUserPlan] = useState([]);

  const [alternatives, setAlternatives] = useState([]);
  const [alternativeBusy, setAlternativeBusy] = useState(false);
  const [alternativeError, setAlternativeError] = useState(null);
  const [selectedAiProfileId, setSelectedAiProfileId] = useState(
    DEFAULT_AI_PROFILE,
  );
  const [aiPlan, setAiPlan] = useState([]);
  const [aiDiagnostics, setAiDiagnostics] = useState(null);

  const [view, setView] = useState('none');

  const [frontier, setFrontier] = useState(null);
  const [frontierBusy, setFrontierBusy] = useState(false);
  const [frontierError, setFrontierError] = useState(null);

  const [stability, setStability] = useState(null);
  const [stabilityBusy, setStabilityBusy] = useState(false);
  const [stabilityError, setStabilityError] = useState(null);

  const [pareto, setPareto] = useState(null);
  const [paretoBusy, setParetoBusy] = useState(false);
  const [paretoError, setParetoError] = useState(null);

  const [layerState, setLayerState] = useState({
    hazard: true,
    cells: true,
    roads: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    loadLaderaData(controller.signal)
      .then(setData)
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!data || !mapNode.current) return undefined;

    const api = createLaderaMap({
      container: mapNode.current,
      data,
      onSelectCell: setSelectedCellId,
      onSelectBarrio: setSelectedBarrio,
      onReady: () => setMapReady(true),
    });
    mapApiRef.current = api;

    return () => {
      setMapReady(false);
      api.destroy();
      mapApiRef.current = null;
    };
  }, [data]);

  const context = useMemo(
    () => (data ? createScenarioContext(data.buildings, data.cells) : null),
    [data],
  );

  const activePlan = useMemo(
    () =>
      view === 'user'
        ? userPlan
        : view === 'ai'
          ? aiPlan
          : EMPTY_PLAN,
    [view, userPlan, aiPlan],
  );

  const userCost = planCostCredits(userPlan);
  const aiCost = planCostCredits(aiPlan);

  const baseline = useMemo(
    () =>
      context
        ? evaluatePortfolio({
            context,
            projects: EMPTY_PLAN,
            scenario,
          })
        : null,
    [context, scenario],
  );

  const metrics = useMemo(() => {
    if (!context) return null;
    if (!activePlan.length) return baseline;
    return evaluatePortfolio({
      context,
      projects: activePlan,
      scenario,
    });
  }, [context, activePlan, scenario, baseline]);

  const monteCarlo = useMemo(
    () =>
      context && activePlan.length
        ? monteCarloPortfolio({
            context,
            projects: activePlan,
            scenario,
            seed: MODEL_PARAMETERS.scenarioUncertainty.comparisonSeed,
          })
        : null,
    [context, activePlan, scenario],
  );

  const selectedCell = useMemo(
    () =>
      data?.cells.features.find(
        (feature) =>
          Number(feature.properties.cell_id) === Number(selectedCellId),
      )?.properties ?? null,
    [data, selectedCellId],
  );

  const llanaditas = useMemo(
    () =>
      data?.screening.features.find((feature) =>
        String(feature.properties.BARRIO ?? '')
          .toUpperCase()
          .includes('LLANADITAS'),
      ) ?? null,
    [data],
  );

  const capturedVolumeM3 = useMemo(
    () =>
      data
        ? capturedRainwaterVolumeM3(
            data.cells,
            activePlan,
            scenario.rainMm,
          )
        : 0,
    [data, activePlan, scenario.rainMm],
  );

  const canAddSelected = useMemo(() => {
    if (selectedCellId == null) return false;

    const cost = INTERVENTIONS[selectedType].costCredits;
    const duplicate = userPlan.some(
      (project) =>
        Number(project.cell_id) === Number(selectedCellId) &&
        project.type === selectedType,
    );
    const cellProjectCount = userPlan.filter(
      (project) =>
        Number(project.cell_id) === Number(selectedCellId),
    ).length;

    return (
      !duplicate &&
      cellProjectCount < MODEL_LIMITS.maxProjectsPerCell &&
      userCost + cost <= budgetCredits
    );
  }, [
    selectedCellId,
    selectedType,
    userPlan,
    userCost,
    budgetCredits,
  ]);

  function clearDerivedDecisionProducts() {
    setAlternatives([]);
    setAlternativeError(null);
    setAiPlan([]);
    setAiDiagnostics(null);

    setFrontier(null);
    setFrontierError(null);

    setStability(null);
    setStabilityError(null);

    setPareto(null);
    setParetoError(null);

    setView((current) => (current === 'ai' ? 'none' : current));
  }

  useEffect(() => {
    setUserPlan((plan) => fitPlanToBudget(plan, budgetCredits));
    clearDerivedDecisionProducts();
  }, [budgetCredits]);

  useEffect(() => {
    clearDerivedDecisionProducts();
  }, [
    scenario.rainMm,
    scenario.antecedentWetness,
    scenario.planningYear,
  ]);

  useEffect(() => {
    if (view === 'user' && !userPlan.length) setView('none');
    if (view === 'ai' && !aiPlan.length) setView('none');
  }, [view, userPlan.length, aiPlan.length]);

  useEffect(() => {
    if (!mapReady) return;
    mapApiRef.current?.setScope(scope);
  }, [scope, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    mapApiRef.current?.setCityLens(cityLens);
  }, [cityLens, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    mapApiRef.current?.setSelectedBarrio(selectedBarrio);
    if (scopeRef.current === 'city' && selectedBarrio) {
      mapApiRef.current?.focusBarrio(selectedBarrio);
    }
  }, [selectedBarrio, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    mapApiRef.current?.setSelectedCell(selectedCellId);
  }, [selectedCellId, mapReady]);

  useEffect(() => {
    if (!mapReady || scope !== 'sandbox') return;
    mapApiRef.current?.setLayerVisibility(layerState);
  }, [layerState, scope, mapReady]);

  useEffect(() => {
    if (
      !mapReady ||
      !context ||
      !data ||
      scope !== 'sandbox'
    ) return;

    const stressGeoJson = buildingStressGeoJson({
      context,
      projects: activePlan,
      scenario,
      originalGeoJson: data.buildings,
    });
    mapApiRef.current?.updateBuildingStress(stressGeoJson);
    mapApiRef.current?.updateProjects(
      activePlan,
      data.cells,
    );
  }, [
    mapReady,
    context,
    data,
    activePlan,
    scenario,
    scope,
  ]);

  function addSelectedIntervention() {
    if (!canAddSelected) return;
    setUserPlan((plan) => [
      ...plan,
      {
        cell_id: Number(selectedCellId),
        type: selectedType,
      },
    ]);
    setView('user');
  }

  function removeUserProject(projectToRemove) {
    setUserPlan((plan) =>
      plan.filter(
        (project) =>
          !(
            Number(project.cell_id) ===
              Number(projectToRemove.cell_id) &&
            project.type === projectToRemove.type
          ),
      ),
    );
  }

  function clearUserPlan() {
    setUserPlan([]);
    if (view === 'user') setView('none');
  }

  function selectAlternative(profileId, options = alternatives) {
    const selected = alternativeById(options, profileId);
    if (!selected) return;

    setSelectedAiProfileId(profileId);
    setAiPlan(selected.plan);
    setAiDiagnostics(selected.diagnostics);
    setView(selected.plan.length ? 'ai' : 'none');

    // These outputs are policy-profile dependent.
    setFrontier(null);
    setFrontierError(null);
    setStability(null);
    setStabilityError(null);
  }

  function generateAlternatives() {
    if (!context || !data || alternativeBusy) return;

    setAlternativeBusy(true);
    setAlternativeError(null);

    window.setTimeout(() => {
      try {
        const options = generateAlternativePortfolios({
          context,
          cellsGeoJson: data.cells,
          scenario,
          budgetCredits,
        });
        setAlternatives(options);

        const recommended = [...options].sort(
          (a, b) =>
            b.uncertainty.p10 - a.uncertainty.p10 ||
            b.downsideRetention - a.downsideRetention,
        )[0];
        const profileId =
          recommended?.profileId ??
          (
            alternativeById(options, selectedAiProfileId)
              ? selectedAiProfileId
              : DEFAULT_AI_PROFILE
          );
        selectAlternative(profileId, options);
      } catch (error) {
        setAlternativeError(
          error instanceof Error
            ? error.message
            : String(error),
        );
      } finally {
        setAlternativeBusy(false);
      }
    }, 0);
  }

  function analyzeFrontier() {
    if (!context || !data || frontierBusy) return;

    setFrontierBusy(true);
    setFrontierError(null);

    window.setTimeout(() => {
      try {
        setFrontier(
          budgetRobustnessFrontier({
            context,
            cellsGeoJson: data.cells,
            scenario,
            profile: selectedAiProfileId,
          }),
        );
      } catch (error) {
        setFrontierError(
          error instanceof Error
            ? error.message
            : String(error),
        );
      } finally {
        setFrontierBusy(false);
      }
    }, 0);
  }

  function analyzeStability() {
    if (!context || !data || stabilityBusy) return;

    setStabilityBusy(true);
    setStabilityError(null);

    window.setTimeout(() => {
      try {
        setStability(
          portfolioSelectionStability({
            context,
            cellsGeoJson: data.cells,
            scenario,
            budgetCredits,
            profile: selectedAiProfileId,
          }),
        );
      } catch (error) {
        setStabilityError(
          error instanceof Error
            ? error.message
            : String(error),
        );
      } finally {
        setStabilityBusy(false);
      }
    }, 0);
  }

  function analyzePareto() {
    if (!context || !data || paretoBusy) return;

    setParetoBusy(true);
    setParetoError(null);

    window.setTimeout(() => {
      try {
        setPareto(
          sampledParetoSet({
            context,
            cellsGeoJson: data.cells,
            scenario,
            budgetCredits,
          }),
        );
      } catch (error) {
        setParetoError(
          error instanceof Error
            ? error.message
            : String(error),
        );
      } finally {
        setParetoBusy(false);
      }
    }, 0);
  }

  function exportDecisionPackage() {
    if (!data || !metrics || !baseline) return;

    const payload = buildDecisionPackage({
      scenario,
      budgetCredits,
      view,
      cityLens,
      selectedAiProfileId,
      projects: activePlan,
      metrics,
      baseline,
      monteCarlo,
      frontier,
      aiDiagnostics:
        view === 'ai' ? aiDiagnostics : null,
      alternatives,
      stability,
      pareto,
      summary: data.summary,
      evidence: data.evidence,
    });
    downloadDecisionPackage(payload);
  }

  function changeView(nextView) {
    if (nextView === 'ai' && !aiPlan.length) return;
    if (nextView === 'user' && !userPlan.length) return;
    setView(nextView);
  }

  if (loadError) throw loadError;

  return (
    <div className="app">
      <div ref={mapNode} className="map" />

      {!data && (
        <div className="loading">
          <OureaLogo />
          <b>OUREA</b>
          <span>Preparing the Medellín decision model…</span>
        </div>
      )}

      <TopBar
        scope={scope}
        onScopeChange={setScope}
        view={view}
        onViewChange={changeView}
        userCost={userCost}
        aiCost={aiCost}
        aiProfileLabel={aiDiagnostics?.profile?.label}
      />

      <MapLegend
        scope={scope}
        cityLens={cityLens}
      />

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
            scenario={scenario}
            onScenarioChange={setScenario}
            summary={data?.summary}
            metrics={metrics}
            baseline={baseline}
            monteCarlo={monteCarlo}
            capturedVolumeM3={capturedVolumeM3}
            budgetCredits={budgetCredits}
            onBudgetChange={setBudgetCredits}
            selectedType={selectedType}
            onSelectType={setSelectedType}
            selectedCell={selectedCell}
            userPlan={userPlan}
            userCost={userCost}
            canAddSelected={canAddSelected}
            onAddSelected={addSelectedIntervention}
            onRemoveUserProject={removeUserProject}
            onClearUser={clearUserPlan}
            aiPlan={aiPlan}
            aiDiagnostics={aiDiagnostics}
            alternatives={alternatives}
            alternativeBusy={alternativeBusy}
            alternativeError={alternativeError}
            selectedAiProfileId={selectedAiProfileId}
            onGenerateAlternatives={generateAlternatives}
            onSelectAlternative={selectAlternative}
            frontier={frontier}
            frontierBusy={frontierBusy}
            frontierError={frontierError}
            onAnalyzeFrontier={analyzeFrontier}
            onExportDecisionPackage={exportDecisionPackage}
            stability={stability}
            stabilityBusy={stabilityBusy}
            stabilityError={stabilityError}
            onAnalyzeStability={analyzeStability}
            pareto={pareto}
            paretoBusy={paretoBusy}
            paretoError={paretoError}
            onAnalyzePareto={analyzePareto}
            evidence={data?.evidence}
            replay={data?.replay}
            replayContract={data?.replayContract}
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
