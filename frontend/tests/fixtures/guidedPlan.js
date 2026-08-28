export const GUIDED_PLAN = Object.freeze([
  { cell_id: 12, type: 'rwh' },
  { cell_id: 18, type: 'drainage' },
]);

export const RESTORATION_PLAN = Object.freeze([
  { cell_id: 7, type: 'restoration' },
]);

export const GUIDED_CELLS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        cell_id: 12,
        buildings: 4,
        households_proxy: 3.72,
        population_proxy: 10.9,
        mean_slope_deg: 20.16,
        high_hazard_buildings: 4,
        vehicular_access_m: 40,
        pedestrian_access_m: 40,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.53678, 6.25110],
          [-75.53678, 6.25182],
          [-75.53751, 6.25182],
          [-75.53751, 6.25110],
          [-75.53678, 6.25110],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        cell_id: 18,
        buildings: 47,
        households_proxy: 8.96,
        population_proxy: 23.36,
        mean_slope_deg: 20.55,
        high_hazard_buildings: 47,
        vehicular_access_m: 80,
        pedestrian_access_m: 40,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.53751, 6.25182],
          [-75.53751, 6.25254],
          [-75.53824, 6.25254],
          [-75.53824, 6.25182],
          [-75.53751, 6.25182],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        cell_id: 7,
        buildings: 25,
        households_proxy: 20,
        population_proxy: 80,
        mean_slope_deg: 28,
        high_hazard_buildings: 12,
        vehicular_access_m: 50,
        pedestrian_access_m: 40,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-75.54040, 6.25108],
          [-75.54040, 6.25180],
          [-75.54113, 6.25180],
          [-75.54113, 6.25108],
          [-75.54040, 6.25108],
        ]],
      },
    },
  ],
};

export function guidedPayload(overrides = {}) {
  return {
    generated_at: '2026-08-28T15:00:00Z',
    selected_ai_policy: 'balanced',
    budget: { spent: 4, available: 10 },
    portfolio: GUIDED_PLAN,
    action_footprint: {
      planning_cells_targeted: 2,
      cadastral_buildings_in_targeted_cells: 51,
      high_hazard_buildings_in_targeted_cells: 51,
      population_proxy_in_targeted_cells: 34.26,
    },
    uncertainty: { benefit_proxy_p10: 8.2, median: 10, benefit_proxy_p90: 12 },
    community_safeguards: { validation_status: 'not_assessed' },
    climate_context: {
      source_name: 'CHIRPS v3.0 Final',
      climatology_period: { label: '1991-2020' },
    },
    scenario: { preset_id: 'typical_wet' },
    reproducible_id: 'ourea-test',
    scope: { city: 'Medellín' },
    ...overrides,
  };
}
