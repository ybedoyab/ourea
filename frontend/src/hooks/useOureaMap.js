import { useEffect, useRef, useState } from 'react';
import { createOureaMap } from '../services/mapService.js';
import { buildingStressGeoJson } from '../domain/scenarioEngine.js';

export function useOureaMap({
  data,
  context,
  scope,
  cityLens,
  selectedBarrio,
  selectedCellId,
  layerState,
  activePlan,
  scenario,
  onSelectCell,
  onSelectBarrio,
}) {
  const mapNode = useRef(null);
  const mapApiRef = useRef(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!data || !mapNode.current) return undefined;

    const api = createOureaMap({
      container: mapNode.current,
      data,
      onSelectCell,
      onSelectBarrio,
      onReady: () => setMapReady(true),
    });
    mapApiRef.current = api;

    return () => {
      setMapReady(false);
      api.destroy();
      mapApiRef.current = null;
    };
  }, [data, onSelectCell, onSelectBarrio]);

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
    if (!mapReady || !context || !data || scope !== 'sandbox') return;

    mapApiRef.current?.updateBuildingStress(
      buildingStressGeoJson({
        context,
        projects: activePlan,
        scenario,
        originalGeoJson: data.buildings,
      }),
    );
    mapApiRef.current?.updateProjects(activePlan, data.cells);
  }, [mapReady, context, data, activePlan, scenario, scope]);

  return { mapNode, mapReady };
}
