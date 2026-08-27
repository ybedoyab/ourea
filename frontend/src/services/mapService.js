import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CITY_MAX_BOUNDS, MAP_VIEWS, SANDBOX_BBOX } from '../config/modelConfig.js';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
const BASEMAP_TILES = [
  'https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
];

const DEM_SOURCE = Object.freeze({
  type: 'raster-dem',
  tiles: ['/terrain/{z}/{x}/{y}.png'],
  tileSize: 256,
  encoding: 'mapbox',
  minzoom: 15,
  maxzoom: 18,
  bounds: SANDBOX_BBOX,
});

const SANDBOX_LAYER_IDS = Object.freeze([
  'shade',
  'hazard',
  'roads',
  'cells-outline',
  'cells-fill',
  'cells-hit',
  'cells-hover-fill',
  'buildings',
  'cells-hover',
  'cell-labels',
  'projects',
]);
const CITY_LAYER_IDS = Object.freeze([
  'screening-fill',
  'screening-outline',
  'screening-selected',
  'comuna-labels',
  'barrio-labels',
]);

const CITY_LENS_FIELDS = Object.freeze({
  exposure: 'priority_exposure',
  balanced: 'priority_balanced',
  equity: 'priority_equity',
});

const CAMERA = Object.freeze({
  city: Object.freeze({ minZoom: 11, maxZoom: 15.4 }),
  sandbox: Object.freeze({ minZoom: 14.2, maxZoom: 18.5 }),
});

const SANDBOX_PLACE = 'Llanaditas No.2 · Comuna 8 · Villa Hermosa';

function cityFillExpression(lens) {
  const field = CITY_LENS_FIELDS[lens] ?? CITY_LENS_FIELDS.balanced;
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', field], -1],
    -1, '#343b3f',
    0, '#2e5b4a',
    0.45, '#b69b45',
    0.72, '#d66f45',
    1, '#b42d34',
  ];
}

function setVisibility(map, layerId, visible) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}

function padBbox(bbox, factor) {
  const [west, south, east, north] = bbox;
  const dx = (east - west) * factor;
  const dy = (north - south) * factor;
  return [west - dx, south - dy, east + dx, north + dy];
}

function bboxToBounds(bbox) {
  return [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
}

function sandboxGroundFeature() {
  const [west, south, east, north] = SANDBOX_BBOX;
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    },
  };
}

function geometryBounds(geometry) {
  if (!geometry) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function walk(value) {
    if (!Array.isArray(value) || value.length === 0) return;
    if (typeof value[0] === 'number') {
      minX = Math.min(minX, value[0]);
      minY = Math.min(minY, value[1]);
      maxX = Math.max(maxX, value[0]);
      maxY = Math.max(maxY, value[1]);
      return;
    }
    for (const item of value) walk(item);
  }

  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries ?? []) walk(child.coordinates);
  } else {
    walk(geometry.coordinates);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return [[minX, minY], [maxX, maxY]];
}

function comunaLabelCollection(screening) {
  const groups = new Map();
  for (const feature of screening.features ?? []) {
    const name = feature.properties?.comuna_name;
    const code = String(feature.properties?.comuna_code ?? '');
    if (!name || !code) continue;
    const bounds = geometryBounds(feature.geometry);
    if (!bounds) continue;
    const current = groups.get(code) ?? {
      name,
      code,
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    current.minX = Math.min(current.minX, bounds[0][0]);
    current.minY = Math.min(current.minY, bounds[0][1]);
    current.maxX = Math.max(current.maxX, bounds[1][0]);
    current.maxY = Math.max(current.maxY, bounds[1][1]);
    groups.set(code, current);
  }

  return {
    type: 'FeatureCollection',
    features: [...groups.values()].map((item) => ({
      type: 'Feature',
      properties: {
        comuna_name: item.name,
        comuna_code: item.code,
        label: `${item.code}  ${item.name}`,
      },
      geometry: {
        type: 'Point',
        coordinates: [
          (item.minX + item.maxX) / 2,
          (item.minY + item.maxY) / 2,
        ],
      },
    })),
  };
}

function formatCount(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-US');
}

function sandboxInspectHtml(cell, building) {
  const cellId = Number(cell?.cell_id ?? building?.cell_id);
  if (!Number.isFinite(cellId)) return '';

  const barrio = building?.BARRIO || 'Llanaditas No.2';
  const lines = [
    `<strong>Planning cell ${cellId}</strong>`,
    `<span>${barrio === 'LLANADITAS No.2' ? SANDBOX_PLACE : `${barrio} · Comuna 8`}</span>`,
  ];

  if (cell) {
    const buildings = formatCount(cell.buildings);
    const people = formatCount(cell.population_proxy);
    const slope = Number(cell.mean_slope_deg);
    const hazard = formatCount(cell.high_hazard_buildings);
    lines.push(`<span>${buildings} buildings · ~${people} people (proxy)</span>`);
    if (Number.isFinite(slope) && slope > 0) {
      lines.push(`<span>Mean slope ${slope.toFixed(1)}° · ${hazard} in official high hazard</span>`);
    }
  }

  if (building) {
    const bits = [];
    const height = Number(building.height_m);
    const floors = Number(building.numero_pisos);
    const estrato = building.estrato;
    const hazardMax = building.hazard_max;
    if (Number.isFinite(floors) && floors > 0) bits.push(`${floors} floor${floors === 1 ? '' : 's'}`);
    if (Number.isFinite(height) && height > 0) bits.push(`${height.toFixed(0)} m`);
    if (estrato != null && estrato !== '') bits.push(`stratum ${estrato}`);
    if (hazardMax) bits.push(`hazard ${hazardMax}`);
    if (bits.length) lines.push(`<span>Building · ${bits.join(' · ')}</span>`);
  }

  return lines.join('');
}

function createViewResetControl() {
  return {
    onAdd(map) {
      this._map = map;
      this._container = document.createElement('div');
      this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group map-view-ctrl';
      const button = document.createElement('button');
      button.type = 'button';
      button.title = 'Reset view';
      button.setAttribute('aria-label', 'Reset view');
      button.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 3.4 4 10.2h1.8V20h5.1v-5.6h2.2V20h5.1v-9.8H20L12 3.4z"/></svg>';
      button.addEventListener('click', () => {
        const sandbox = map.getLayer('buildings')
          && map.getLayoutProperty('buildings', 'visibility') === 'visible';
        map.stop();
        map.easeTo({
          ...(sandbox ? MAP_VIEWS.sandbox : MAP_VIEWS.city),
          duration: 700,
          essential: true,
        });
      });
      this._container.appendChild(button);
      return this._container;
    },
    onRemove() {
      this._container?.remove();
      this._map = undefined;
    },
  };
}

function projectPointFeature(project, cellsGeoJson, index) {
  const cellFeature = cellsGeoJson.features.find(
    (feature) => Number(feature.properties.cell_id) === Number(project.cell_id),
  );
  if (!cellFeature) return null;
  const ring = cellFeature.geometry.coordinates[0];
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  return {
    type: 'Feature',
    properties: { ...project, index },
    geometry: {
      type: 'Point',
      coordinates: [
        (Math.min(...xs) + Math.max(...xs)) / 2,
        (Math.min(...ys) + Math.max(...ys)) / 2,
      ],
    },
  };
}

export function createOureaMap({ container, data, onSelectCell, onSelectBarrio, onReady }) {
  let cameraGeneration = 0;
  let settleTimer = 0;

  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      glyphs: GLYPHS_URL,
      sources: {},
      layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#11171a' } }],
    },
    ...MAP_VIEWS.city,
    attributionControl: false,
    maxBounds: CITY_MAX_BOUNDS,
    minZoom: CAMERA.city.minZoom,
    maxZoom: CAMERA.sandbox.maxZoom,
    minPitch: 0,
    maxPitch: 70,
    dragRotate: true,
    pitchWithRotate: true,
    touchPitch: true,
    touchZoomRotate: true,
    keyboard: true,
    renderWorldCopies: false,
    fadeDuration: 120,
    cancelPendingTileRequestsWhileZooming: false,
  });

  map.dragRotate.enable();
  map.touchPitch.enable();
  map.keyboard.enable();
  map.touchZoomRotate.enable();
  map.touchZoomRotate.enableRotation();

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
  map.addControl(createViewResetControl(), 'bottom-right');
  map.on('error', (event) => {
    const message = String(event.error?.message ?? event.error ?? '');
    const terrainFault = (
      event.error?.name === 'InvalidStateError'
      || event.error?.name === 'RangeError'
      || /decoded|terrain|DEM|out of range source/i.test(message)
    );
    if (terrainFault) {
      if (map.getTerrain()) map.setTerrain(null);
      return;
    }
    console.warn('MapLibre error', event.error ?? event);
  });

  const hoverPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
    className: 'map-hover-popup',
    maxWidth: '280px',
  });

  const inspectEl = document.createElement('div');
  inspectEl.className = 'map-inspect';
  inspectEl.hidden = true;
  container.appendChild(inspectEl);

  const cellsById = new Map(
    (data.cells?.features ?? []).map((feature) => [
      Number(feature.properties.cell_id),
      feature.properties,
    ]),
  );

  let hoveredCellId = null;

  const resizeObserver = new ResizeObserver(() => {
    map.resize();
  });
  resizeObserver.observe(container);

  function clearSettleTimer() {
    if (settleTimer) {
      window.clearTimeout(settleTimer);
      settleTimer = 0;
    }
  }

  function afterSettled(generation, callback) {
    clearSettleTimer();
    let ran = false;
    const run = () => {
      if (ran || generation !== cameraGeneration) return;
      ran = true;
      clearSettleTimer();
      callback();
    };
    map.once('idle', run);
    settleTimer = window.setTimeout(run, 1500);
  }

  function sandboxCenterReady() {
    const { lng, lat } = map.getCenter();
    return (
      map.getZoom() >= 15.1
      && lng >= SANDBOX_BBOX[0]
      && lng <= SANDBOX_BBOX[2]
      && lat >= SANDBOX_BBOX[1]
      && lat <= SANDBOX_BBOX[3]
    );
  }

  function lockCamera(scope) {
    const limits = CAMERA[scope] ?? CAMERA.city;
    map.setMinZoom(limits.minZoom);
    map.setMaxZoom(limits.maxZoom);
    map.setMaxBounds(scope === 'city' ? CITY_MAX_BOUNDS : null);
  }

  function runCamera(scope, animate) {
    const generation = ++cameraGeneration;
    clearSettleTimer();
    map.stop();
    map.setMaxBounds(null);
    map.setMinZoom(CAMERA.city.minZoom);
    map.setMaxZoom(CAMERA.sandbox.maxZoom);
    if (map.getTerrain()) map.setTerrain(null);

    map.easeTo({
      ...(scope === 'sandbox' ? MAP_VIEWS.sandbox : MAP_VIEWS.city),
      duration: animate ? (scope === 'sandbox' ? 850 : 750) : 0,
      essential: true,
    });

    afterSettled(generation, () => {
      if (scope === 'sandbox' && !sandboxCenterReady()) {
        map.jumpTo(MAP_VIEWS.sandbox);
      }
      lockCamera(scope);
      if (scope === 'sandbox') {
        setVisibility(map, 'buildings', true);
      }
    });
  }

  map.on('load', () => {
    map.resize();

    map.addSource('basemap', {
      type: 'raster',
      tiles: BASEMAP_TILES,
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap © CARTO',
    });
    map.addLayer({
      id: 'basemap',
      type: 'raster',
      source: 'basemap',
      paint: {
        'raster-opacity': [
          'interpolate', ['linear'], ['zoom'],
          11, 0.72,
          13, 0.5,
          15.5, 0.4,
          17.5, 0.2,
        ],
        'raster-saturation': -0.35,
        'raster-contrast': 0.08,
      },
    });

    map.addSource('screening', { type: 'geojson', data: data.screening });
    map.addLayer({
      id: 'screening-fill',
      type: 'fill',
      source: 'screening',
      paint: {
        'fill-color': cityFillExpression('balanced'),
        'fill-opacity': [
          'case',
          ['==', ['coalesce', ['get', 'population_2026'], -1], -1],
          0.28,
          0.78,
        ],
      },
    });
    map.addLayer({
      id: 'screening-outline',
      type: 'line',
      source: 'screening',
      paint: { 'line-color': '#ece4d3', 'line-opacity': 0.42, 'line-width': 0.85 },
    });
    map.addLayer({
      id: 'screening-selected',
      type: 'line',
      source: 'screening',
      filter: ['==', ['get', 'OBJECTID'], -999999],
      paint: {
        'line-color': '#f1eadc',
        'line-opacity': 0.95,
        'line-width': 2.6,
      },
    });

    map.addSource('comunas', { type: 'geojson', data: comunaLabelCollection(data.screening) });
    map.addLayer({
      id: 'comuna-labels',
      type: 'symbol',
      source: 'comunas',
      minzoom: 11,
      maxzoom: 13.55,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 13.2, 14],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.05,
        'text-max-width': 9,
        'text-padding': 6,
        'text-allow-overlap': false,
        'symbol-sort-key': ['to-number', ['get', 'comuna_code']],
      },
      paint: {
        'text-color': '#f4eee3',
        'text-halo-color': '#101618',
        'text-halo-width': 1.6,
        'text-opacity': 0.94,
      },
    });
    map.addLayer({
      id: 'barrio-labels',
      type: 'symbol',
      source: 'screening',
      minzoom: 13.2,
      layout: {
        'text-field': ['get', 'BARRIO'],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 13.2, 10, 15, 13],
        'text-max-width': 8,
        'text-padding': 2,
        'text-optional': true,
      },
      paint: {
        'text-color': '#f7f1e4',
        'text-halo-color': '#12181b',
        'text-halo-width': 1.25,
      },
    });

    map.addSource('sandbox-ground', { type: 'geojson', data: sandboxGroundFeature() });
    map.addLayer({
      id: 'sandbox-ground',
      type: 'fill',
      source: 'sandbox-ground',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': '#314147',
        'fill-opacity': 0.35,
      },
    });

    map.addSource('dem-shade', { ...DEM_SOURCE });
    map.addLayer({
      id: 'shade',
      type: 'hillshade',
      source: 'dem-shade',
      layout: { visibility: 'none' },
      paint: {
        'hillshade-exaggeration': 0.52,
        'hillshade-shadow-color': '#1c262b',
        'hillshade-highlight-color': '#efe6d2',
        'hillshade-accent-color': '#8b9693',
        'hillshade-illumination-direction': 315,
      },
    });

    map.addSource('hazard', { type: 'geojson', data: data.hazard });
    map.addLayer({
      id: 'hazard',
      type: 'fill',
      source: 'hazard',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'match', ['get', 'Categoria'],
          'Alta', '#e04b45', 'Media', '#d99d3d', 'Baja', '#4f9b68', '#777777',
        ],
        'fill-opacity': 0.18,
      },
    });

    map.addSource('roads', { type: 'geojson', data: data.roads });
    map.addLayer({
      id: 'roads',
      type: 'line',
      source: 'roads',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#f0e7d0',
        'line-opacity': 0.9,
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1.15, 18, 3.4],
      },
    });

    data.cells.features.forEach((feature) => {
      if (feature.id == null) feature.id = Number(feature.properties.cell_id);
    });
    map.addSource('cells', { type: 'geojson', data: data.cells });
    map.addLayer({
      id: 'cells-outline',
      type: 'line',
      source: 'cells',
      layout: { visibility: 'none' },
      paint: { 'line-color': '#a8bcc4', 'line-opacity': 0.42, 'line-width': 1.05 },
    });
    map.addLayer({
      id: 'cells-fill',
      type: 'fill',
      source: 'cells',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#7cc4d7', 'fill-opacity': 0 },
    });
    map.addLayer({
      id: 'cells-hit',
      type: 'fill',
      source: 'cells',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#000000', 'fill-opacity': 0 },
    });
    map.addLayer({
      id: 'cells-hover-fill',
      type: 'fill',
      source: 'cells',
      layout: { visibility: 'none' },
      filter: ['==', ['get', 'cell_id'], -1],
      paint: {
        'fill-color': '#f4ead8',
        'fill-opacity': 0.18,
      },
    });

    data.buildings.features.forEach((feature, index) => {
      if (feature.id == null) feature.id = index + 1;
    });
    map.addSource('buildings', { type: 'geojson', data: data.buildings });
    map.addLayer({
      id: 'buildings',
      type: 'fill-extrusion',
      source: 'buildings',
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-height': ['coalesce', ['get', 'height_m'], 3],
        'fill-extrusion-base': 0,
        'fill-extrusion-color': [
          'interpolate', ['linear'],
          ['coalesce', ['feature-state', 'scenario_stress'], -1],
          -1, '#c56a58',
          0, '#4f9b68',
          0.48, '#c4a14b',
          0.68, '#d66f45',
          0.82, '#d7433c',
          1, '#761919',
        ],
        'fill-extrusion-opacity': 0.93,
        'fill-extrusion-vertical-gradient': true,
      },
    });
    map.addLayer({
      id: 'cells-hover',
      type: 'line',
      source: 'cells',
      layout: { visibility: 'none' },
      filter: ['==', ['get', 'cell_id'], -1],
      paint: {
        'line-color': '#f4ead8',
        'line-opacity': 0.95,
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1.8, 18, 3.2],
      },
    });
    map.addLayer({
      id: 'cell-labels',
      type: 'symbol',
      source: 'cells',
      minzoom: 15.7,
      layout: {
        visibility: 'none',
        'text-field': ['concat', 'Cell ', ['to-string', ['get', 'cell_id']]],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 15.7, 10, 18, 13],
        'text-allow-overlap': false,
        'text-padding': 8,
      },
      paint: {
        'text-color': '#f4ead8',
        'text-halo-color': 'rgba(17,23,26,0.9)',
        'text-halo-width': 1.4,
        'text-opacity': 0.92,
      },
    });

    map.addSource('projects', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'projects',
      type: 'circle',
      source: 'projects',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 5, 18, 10],
        'circle-color': [
          'match', ['get', 'type'],
          'rwh', '#67b7d1', 'drainage', '#d2a24b', 'restoration', '#64a96d', '#ffffff',
        ],
        'circle-stroke-color': '#111111',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.95,
      },
    });

    function isSandboxVisible() {
      return map.getLayer('buildings')
        && map.getLayoutProperty('buildings', 'visibility') === 'visible';
    }

    function visibleLayers(ids) {
      return ids.filter((id) => (
        map.getLayer(id) && map.getLayoutProperty(id, 'visibility') === 'visible'
      ));
    }

    function clearSandboxHover() {
      hoveredCellId = null;
      hoverPopup.remove();
      inspectEl.hidden = true;
      inspectEl.innerHTML = '';
      if (map.getLayer('cells-hover')) {
        map.setFilter('cells-hover', ['==', ['get', 'cell_id'], -1]);
      }
      if (map.getLayer('cells-hover-fill')) {
        map.setFilter('cells-hover-fill', ['==', ['get', 'cell_id'], -1]);
      }
      if (isSandboxVisible()) map.getCanvas().style.cursor = '';
    }

    function showSandboxInspect(event, cell, building) {
      const html = sandboxInspectHtml(cell, building);
      const cellId = Number(cell?.cell_id ?? building?.cell_id);
      if (!html || !Number.isFinite(cellId)) {
        clearSandboxHover();
        return;
      }
      if (hoveredCellId !== cellId) {
        if (map.getLayer('cells-hover')) {
          map.setFilter('cells-hover', ['==', ['get', 'cell_id'], cellId]);
        }
        if (map.getLayer('cells-hover-fill')) {
          map.setFilter('cells-hover-fill', ['==', ['get', 'cell_id'], cellId]);
        }
      }
      hoveredCellId = cellId;
      inspectEl.innerHTML = html;
      inspectEl.hidden = false;
      hoverPopup.setLngLat(event.lngLat).setHTML(html).addTo(map);
      map.getCanvas().style.cursor = 'pointer';
    }

    map.on('click', 'screening-fill', (event) => {
      if (event.features?.length) onSelectBarrio?.(event.features[0].properties);
    });
    map.on('click', (event) => {
      if (!isSandboxVisible()) return;
      const hits = map.queryRenderedFeatures(event.point, {
        layers: visibleLayers(['buildings', 'cells-hit', 'cells-fill']),
      });
      const cellId = Number(hits[0]?.properties?.cell_id);
      if (Number.isFinite(cellId)) onSelectCell?.(cellId);
    });

    map.on('mousemove', 'screening-fill', (event) => {
      const properties = event.features?.[0]?.properties;
      if (!properties) return;
      const comuna = properties.comuna_name
        ? `Comuna ${properties.comuna_code} · ${properties.comuna_name}`
        : 'Special / unmatched polygon';
      hoverPopup
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${properties.BARRIO}</strong><span>${comuna}</span>`,
        )
        .addTo(map);
    });
    map.on('mouseleave', 'screening-fill', () => hoverPopup.remove());

    map.on('mousemove', (event) => {
      if (!isSandboxVisible() || event.originalEvent?.buttons) return;
      const hits = map.queryRenderedFeatures(event.point, {
        layers: visibleLayers(['buildings', 'cells-hit', 'cells-fill', 'cells-outline']),
      });
      if (!hits.length) {
        clearSandboxHover();
        return;
      }
      const building = hits.find((feature) => feature.layer.id === 'buildings')?.properties;
      const cellId = Number(building?.cell_id ?? hits[0]?.properties?.cell_id);
      showSandboxInspect(event, cellsById.get(cellId), building);
    });
    map.getCanvas().addEventListener('mouseleave', clearSandboxHover);

    map.on('mouseenter', 'screening-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'screening-fill', () => { map.getCanvas().style.cursor = ''; });

    onReady?.();
  });

  function setCityLens(lens) {
    if (!map.getLayer('screening-fill')) return;
    map.setPaintProperty(
      'screening-fill',
      'fill-color',
      cityFillExpression(lens),
    );
  }

  function setScope(scope) {
    const isCity = scope === 'city';
    CITY_LAYER_IDS.forEach((id) => setVisibility(map, id, isCity));
    SANDBOX_LAYER_IDS.forEach((id) => setVisibility(map, id, !isCity));
    hoveredCellId = null;
    inspectEl.hidden = true;
    inspectEl.innerHTML = '';
    hoverPopup.remove();
    if (map.getLayer('cells-hover')) {
      map.setFilter('cells-hover', ['==', ['get', 'cell_id'], -1]);
    }
    if (map.getLayer('cells-hover-fill')) {
      map.setFilter('cells-hover-fill', ['==', ['get', 'cell_id'], -1]);
    }
    if (map.getTerrain()) map.setTerrain(null);
    runCamera(scope, true);
  }

  function focusBarrio(barrio) {
    const objectId = Number(barrio?.OBJECTID);
    if (!Number.isFinite(objectId)) return;

    const feature = data.screening.features.find(
      (item) => Number(item.properties.OBJECTID) === objectId,
    );
    const bounds = geometryBounds(feature?.geometry);
    if (!bounds) return;

    const generation = ++cameraGeneration;
    clearSettleTimer();
    map.stop();
    map.setMaxBounds(null);
    map.setMinZoom(CAMERA.city.minZoom);
    map.setMaxZoom(CAMERA.sandbox.maxZoom);
    try {
      map.fitBounds(bounds, {
        padding: { top: 96, right: 56, bottom: 72, left: 56 },
        maxZoom: 14.7,
        pitch: 0,
        bearing: 0,
        duration: 700,
        essential: true,
      });
    } catch {
      const [[west, south], [east, north]] = bounds;
      map.easeTo({
        center: [(west + east) / 2, (south + north) / 2],
        zoom: 14.2,
        pitch: 0,
        bearing: 0,
        duration: 700,
        essential: true,
      });
    }
    map.once('moveend', () => {
      if (generation !== cameraGeneration) return;
      lockCamera('city');
    });
  }

  function setSelectedBarrio(barrio) {
    if (!map.getLayer('screening-selected')) return;
    const objectId = Number(barrio?.OBJECTID);
    map.setFilter(
      'screening-selected',
      Number.isFinite(objectId)
        ? ['==', ['get', 'OBJECTID'], objectId]
        : ['==', ['get', 'OBJECTID'], -999999],
    );
  }

  function setSelectedCell(cellId) {
    if (!map.getLayer('cells-fill')) return;
    const expression = cellId == null
      ? 0
      : ['case', ['==', ['get', 'cell_id'], Number(cellId)], 0.22, 0.012];
    map.setPaintProperty('cells-fill', 'fill-opacity', expression);
  }

  function setLayerVisibility(layerState) {
    const mapping = {
      hazard: ['hazard'],
      cells: ['cells-outline', 'cells-fill'],
      roads: ['roads'],
    };
    for (const [key, ids] of Object.entries(mapping)) {
      for (const id of ids) setVisibility(map, id, Boolean(layerState[key]));
    }
  }

  function updateBuildingStress(buildingsGeoJson) {
    if (!map.getSource('buildings') || !buildingsGeoJson?.features) return;
    for (const feature of buildingsGeoJson.features) {
      const id = feature.id;
      if (id == null) continue;
      map.setFeatureState(
        { source: 'buildings', id },
        { scenario_stress: Number(feature.properties.scenario_stress) || 0 },
      );
    }
  }

  function updateProjects(projects, cellsGeoJson) {
    const features = projects
      .map((project, index) => projectPointFeature(project, cellsGeoJson, index))
      .filter(Boolean);
    map.getSource('projects')?.setData({ type: 'FeatureCollection', features });
  }

  return {
    map,
    setScope,
    setCityLens,
    focusBarrio,
    setSelectedBarrio,
    setSelectedCell,
    setLayerVisibility,
    updateBuildingStress,
    updateProjects,
    destroy: () => {
      clearSettleTimer();
      hoverPopup.remove();
      inspectEl.remove();
      resizeObserver.disconnect();
      map.remove();
    },
  };
}
