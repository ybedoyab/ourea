export const REQUIRED_DATA_FILES = Object.freeze({
  buildings: '/data/buildings.geojson',
  roads: '/data/roads.geojson',
  hazard: '/data/hazard.geojson',
  cells: '/data/planning_cells.geojson',
  summary: '/data/summary.json',
  screening: '/data/medellin_city_priority_screen.geojson',
  evidence: '/data/evidence_status.json',
  replayContract: '/data/replay_contract.json',
});

export const OPTIONAL_DATA_FILES = Object.freeze({
  replay: '/data/replay_timeline.json',
  communityEvidence: '/data/community_evidence.json',
});
