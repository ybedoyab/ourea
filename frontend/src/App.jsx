import { useCallback, useMemo, useReducer, useState } from 'react';
import { MapLegend } from './components/MapLegend.jsx';
import { MapLayersControl } from './components/MapLayersControl.jsx';
import { TopBar } from './components/TopBar.jsx';
import { OureaLogo } from './components/OureaLogo.jsx';
import { BRAND } from './config/brand.js';
import { buildDecisionPackage, downloadDecisionPackage } from './domain/decisionPackage.js';
import { DecisionFlow } from './flow/DecisionFlow.jsx';
import { flowReducer, initialFlowState } from './flow/flowReducer.js';
import { mapScopeForFlow } from './flow/flowGuards.js';
import { useOureaData } from './hooks/useOureaData.js';
import { useOureaMap } from './hooks/useOureaMap.js';
import { usePortfolioWorkspace } from './hooks/usePortfolioWorkspace.js';

export default function App() {
  const { data, loadError } = useOureaData();
  const [flow, dispatch] = useReducer(flowReducer, initialFlowState);
  const [selectedBarrio, setSelectedBarrio] = useState(null);
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [selectedType, setSelectedType] = useState('rwh');
  const [layerState, setLayerState] = useState({
    hazard: true,
    cells: true,
    roads: true,
  });

  const cityLens = flow.cityLens;
  const scope = mapScopeForFlow(flow);
  const onSelectCell = useCallback(setSelectedCellId, []);
  const onSelectBarrio = useCallback(setSelectedBarrio, []);

  const workspace = usePortfolioWorkspace({
    data,
    selectedCellId,
    selectedType,
  });

  const { mapNode, mapStatus, mapError } = useOureaMap({
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
        climateContext: data.climateContext,
        cells: data.cells,
      }),
    );
  }

  function startOver() {
    workspace.resetWorkspace();
    setSelectedBarrio(null);
    setSelectedCellId(null);
    setSelectedType('rwh');
    dispatch({ type: 'RESET' });
  }

  if (loadError) throw loadError;

  const areaLabel = flow.areaId === 'llanaditas' || scope === 'sandbox'
    ? BRAND.provingGround
    : 'Medellín';

  return (
    <div className={`app app-${flow.mode} app-step-${flow.step}`}>
      <div className="map">
        <div ref={mapNode} className="map-canvas" data-testid="map-canvas" />
        {mapStatus === 'unavailable' && (
          <div className="map-fallback" role="status" data-testid="map-fallback">
            <b>3D map unavailable in this browser</b>
            <p>
              The decision workflow remains available. Enable WebGL2 or use a compatible
              browser to view the spatial layers.
            </p>
            {mapError ? <small>{mapError}</small> : null}
          </div>
        )}
        {scope === 'sandbox' && (
          <MapLayersControl
            open={flow.layersOpen}
            layerState={layerState}
            onToggleOpen={() => dispatch({ type: 'TOGGLE_LAYERS' })}
            onToggleLayer={(key) =>
              setLayerState((current) => ({
                ...current,
                [key]: !current[key],
              }))
            }
          />
        )}
      </div>

      {!data && (
        <div className="loading">
          <OureaLogo />
          <b>{BRAND.name}</b>
          <span>Preparing the Medellín decision model…</span>
        </div>
      )}

      <TopBar
        areaLabel={areaLabel}
        mode={flow.mode}
        menuOpen={flow.menuOpen}
        onToggleMenu={() => dispatch({ type: 'TOGGLE_MENU' })}
        onCloseMenu={() => dispatch({ type: 'CLOSE_MENU' })}
        onHelp={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'help' })}
        onAbout={() => dispatch({ type: 'OPEN_DRAWER', drawer: 'about' })}
        onStartOver={startOver}
        onToggleExplore={() =>
          dispatch({
            type: flow.mode === 'explore' ? 'RETURN_TO_GUIDED_MODE' : 'ENTER_EXPLORE_MODE',
          })
        }
        onLoadExample={() => {
          dispatch({ type: 'CLOSE_MENU' });
          if (llanaditas) setSelectedBarrio(llanaditas.properties);
          dispatch({ type: 'SET_AREA', areaId: 'llanaditas' });
          dispatch({ type: 'SET_LENS', cityLens: 'balanced' });
          dispatch({ type: 'GENERATION_STARTED', kind: 'example' });
          workspace.runGuidedDemo();
        }}
      />

      <MapLegend
        scope={scope}
        cityLens={cityLens}
        collapsed={flow.legendCollapsed}
        onToggle={() => dispatch({ type: 'TOGGLE_LEGEND' })}
      />

      {data && (
        <DecisionFlow
          state={flow}
          dispatch={dispatch}
          data={data}
          workspace={workspace}
          selectedBarrio={selectedBarrio}
          llanaditas={llanaditas}
          selectedType={selectedType}
          selectedCell={selectedCell}
          selectedCellId={selectedCellId}
          onSelectType={setSelectedType}
          onSelectCell={setSelectedCellId}
          onSelectBarrio={setSelectedBarrio}
          onExport={exportDecisionPackage}
        />
      )}
    </div>
  );
}
