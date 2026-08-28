import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { MapLegend } from './components/MapLegend.jsx';
import { MapLayersControl } from './components/MapLayersControl.jsx';
import { TopBar } from './components/TopBar.jsx';
import { OureaLogo } from './components/OureaLogo.jsx';
import { BRAND } from './config/brand.js';
import { buildDecisionPackage } from './domain/decisionPackage.js';
import { buildDecisionBrief } from './domain/decisionBrief.js';
import { buildDecisionBriefPdf, downloadBlob, renderSearchFigure, renderSitePlate } from './domain/decisionBriefPdf.js';
import { jpegFromDataUrl, jpegSofSize } from './domain/pdfDocument.js';
import {
  clearSessionHash,
  clearStoredSession,
  parseSessionHash,
  readStoredSession,
  simulatorBaseUrl,
  writeSessionHash,
  writeStoredSession,
} from './domain/sessionLink.js';
import { DecisionFlow } from './flow/DecisionFlow.jsx';
import { flowReducer, initialFlowState } from './flow/flowReducer.js';
import { mapScopeForFlow } from './flow/flowGuards.js';
import { useOureaData } from './hooks/useOureaData.js';
import { useOureaMap } from './hooks/useOureaMap.js';
import { usePortfolioWorkspace } from './hooks/usePortfolioWorkspace.js';
import { featureLngLat } from './domain/placeLinks.js';

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
  const workspaceRef = useRef(null);
  const hydratedRef = useRef(false);

  const onSelectCell = useCallback((cellId) => {
    setSelectedCellId(cellId);
    writeSessionHash({
      areaId: 'llanaditas',
      cellId,
      plan: workspaceRef.current?.activePlan,
    });
  }, []);
  const onSelectBarrio = useCallback(setSelectedBarrio, []);

  const workspace = usePortfolioWorkspace({
    data,
    selectedCellId,
    selectedType,
  });
  workspaceRef.current = workspace;

  const { mapNode, mapStatus, mapError, captureMapImage } = useOureaMap({
    data,
    context: workspace.context,
    scope,
    cityLens,
    flowStep: flow.step,
    flowMode: flow.mode,
    selectedBarrio,
    selectedCellId,
    layerState,
    activePlan: workspace.activePlan,
    scenario: workspace.scenario,
    onSelectCell,
    onSelectBarrio,
  });

  const selectedCell = useMemo(() => {
    const feature = data?.cells?.features?.find(
      (item) => Number(item.properties.cell_id) === Number(selectedCellId),
    );
    if (!feature) return null;
    const centroid = featureLngLat(feature);
    return {
      ...feature.properties,
      lat: centroid?.[1] ?? null,
      lng: centroid?.[0] ?? null,
    };
  }, [data, selectedCellId]);

  const llanaditas = useMemo(
    () =>
      data?.screening.features.find((feature) =>
        String(feature.properties.BARRIO ?? '').toUpperCase().includes('LLANADITAS'),
      ) ?? null,
    [data],
  );

  const areaLabel = flow.areaId === 'llanaditas' || scope === 'sandbox'
    ? BRAND.provingGround
    : 'Medellín';

  useEffect(() => {
    if (!data || hydratedRef.current) return;
    if (data.climateContext && !workspace.scenario?.climate) return;
    const fromHash = parseSessionHash(window.location.hash);
    if (!fromHash.areaId && fromHash.cellId == null && !fromHash.plan.length) {
      hydratedRef.current = true;
      return;
    }
    hydratedRef.current = true;
    const stored = readStoredSession();
    const plan = fromHash.plan.length ? fromHash.plan : stored?.plan;
    const cellId = fromHash.cellId ?? stored?.cellId ?? plan?.[0]?.cell_id ?? null;
    if (llanaditas) setSelectedBarrio(llanaditas.properties);
    if (plan?.length) {
      workspaceRef.current?.restoreSession({
        plan,
        view: stored?.view === 'user' && !fromHash.plan.length ? 'user' : 'ai',
        budgetCredits: stored?.budgetCredits,
        scenario: stored?.scenario,
        profileId: stored?.profileId,
      });
      dispatch({
        type: 'HYDRATE_SESSION',
        areaId: 'llanaditas',
        profileId: stored?.profileId,
        portfolioMode: stored?.view === 'user' && !fromHash.plan.length ? 'manual' : 'recommended',
        step: fromHash.plan.length ? 'safeguards' : (stored?.step ?? 'safeguards'),
      });
    } else {
      dispatch({ type: 'SELECT_AREA', areaId: 'llanaditas' });
    }
    if (cellId != null) setSelectedCellId(cellId);
  }, [data, llanaditas, workspace.scenario?.climate]);

  useEffect(() => {
    function onHashChange() {
      const fromHash = parseSessionHash(window.location.hash);
      if (fromHash.plan.length) {
        workspaceRef.current?.restoreSession({ plan: fromHash.plan, view: 'ai' });
        dispatch({ type: 'HYDRATE_SESSION', areaId: 'llanaditas' });
      }
      if (fromHash.cellId != null) setSelectedCellId(fromHash.cellId);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  async function exportDecisionPackage() {
    if (!data || !workspace.metrics || !workspace.baseline) return;
    const payload = buildDecisionPackage({
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
    });
    let mapImage = null;
    let captured = null;
    try {
      captured = captureMapImage();
    } catch {
      captured = null;
    }
    if (captured?.dataUrl) {
      const bytes = jpegFromDataUrl(captured.dataUrl);
      const size = bytes ? jpegSofSize(bytes) : null;
      if (bytes && size?.width && size.height) mapImage = { bytes, width: size.width, height: size.height };
    }
    const brief = buildDecisionBrief(payload, {
      areaLabel,
      mapImage,
      cells: data.cells,
      buildings: data.buildings,
      simulatorUrl: simulatorBaseUrl(),
    });
    const session = {
      plan: workspace.activePlan,
      view: workspace.view,
      budgetCredits: workspace.budgetCredits,
      scenario: workspace.scenario,
      profileId: workspace.selectedAiProfileId,
      cellId: selectedCellId ?? workspace.activePlan[0]?.cell_id ?? null,
      step: flow.step,
    };
    writeStoredSession(session);
    writeSessionHash({
      areaId: 'llanaditas',
      cellId: session.cellId,
      plan: workspace.activePlan,
    });
    try {
      brief.networkImage = renderSearchFigure(brief);
      brief.siteImage = await renderSitePlate(brief);
      downloadBlob(buildDecisionBriefPdf(brief), 'ourea_decision_brief.pdf');
    } catch (error) {
      console.warn('Decision brief PDF could not be generated', error);
      try {
        downloadBlob(buildDecisionBriefPdf({ ...brief, figureImage: null, mapImage: null, networkImage: null, siteImage: null }), 'ourea_decision_brief.pdf');
      } catch (fallbackError) {
        console.warn('Text-only PDF also failed', fallbackError);
      }
    }
  }

  function startOver() {
    workspace.resetWorkspace();
    setSelectedBarrio(null);
    setSelectedCellId(null);
    setSelectedType('rwh');
    clearSessionHash();
    clearStoredSession();
    dispatch({ type: 'RESET' });
  }

  if (loadError) throw loadError;

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
          onSelectCell={onSelectCell}
          onSelectBarrio={setSelectedBarrio}
          onExport={exportDecisionPackage}
        />
      )}
    </div>
  );
}
