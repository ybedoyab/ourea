const REQUIRED_DATA_FILES = Object.freeze({
  buildings: '/data/buildings.geojson',
  roads: '/data/roads.geojson',
  hazard: '/data/hazard.geojson',
  cells: '/data/planning_cells.geojson',
  summary: '/data/summary.json',
  screening: '/data/medellin_city_priority_screen_v4.geojson',
  evidence: '/data/evidence_status.json',
  replayContract: '/data/replay_contract.json',
});

const OPTIONAL_DATA_FILES = Object.freeze({
  replay: '/data/replay_timeline.json',
});

async function fetchJson(url, signal, { optional = false } = {}) {
  const response = await fetch(url, { signal });
  if (optional && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }

  // Vite/static SPA servers can return index.html with HTTP 200 for an unknown
  // optional asset. Parse text explicitly so an absent replay file remains
  // optional instead of crashing the whole application with JSON.parse().
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    if (optional) return null;
    throw new Error(
      `Failed to parse ${url} as JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function loadEntries(files, signal, optional) {
  const entries = await Promise.all(
    Object.entries(files).map(async ([key, url]) => [
      key,
      await fetchJson(url, signal, { optional }),
    ]),
  );
  return Object.fromEntries(entries);
}

export async function loadLaderaData(signal) {
  const [required, optional] = await Promise.all([
    loadEntries(REQUIRED_DATA_FILES, signal, false),
    loadEntries(OPTIONAL_DATA_FILES, signal, true),
  ]);
  return { ...required, ...optional };
}
