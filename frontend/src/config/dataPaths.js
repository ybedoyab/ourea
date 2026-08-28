import { assetUrl } from './assetUrl.js';

export const REQUIRED_DATA_FILES = Object.freeze({
  buildings: assetUrl('data/buildings.geojson'),
  roads: assetUrl('data/roads.geojson'),
  hazard: assetUrl('data/hazard.geojson'),
  cells: assetUrl('data/planning_cells.geojson'),
  summary: assetUrl('data/summary.json'),
  screening: assetUrl('data/medellin_city_priority_screen.geojson'),
  evidence: assetUrl('data/evidence_status.json'),
  climateContext: assetUrl('data/climate_context.json'),
  planAlignment: assetUrl('data/plan_alignment.json'),
  costContext: assetUrl('data/cost_context.json'),
});

export const OPTIONAL_DATA_FILES = Object.freeze({
  communityEvidence: assetUrl('data/community_evidence.json'),
});
