import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMUNITY_FIELD_OPTIONS,
  isAllowedCommunityValue,
  normalizeCommunityRecord,
  parseCommunityEvidenceFile,
} from '../src/config/communityEvidence.js';
import {
  assessCommunitySafeguards,
  emptyCommunityAssessment,
} from '../src/domain/communitySafeguards.js';
import { buildDecisionPackage } from '../src/domain/decisionPackage.js';
import { optimizeRobustPortfolio } from '../src/domain/optimizer.js';
import { createScenarioContext } from '../src/domain/scenarioEngine.js';

const buildings = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        objectid: 1,
        cell_id: 1,
        hazard_max: 'Alta',
        slope_deg: 35,
        population_proxy: 10,
        estrato: 1,
      },
      geometry: null,
    },
    {
      type: 'Feature',
      properties: {
        objectid: 2,
        cell_id: 2,
        hazard_max: 'Media',
        slope_deg: 20,
        population_proxy: 5,
        estrato: 2,
      },
      geometry: null,
    },
  ],
};

const cells = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        cell_id: 1,
        buildings: 10,
        stratum1_buildings: 10,
        rwh_opportunity: 1,
        drainage_corridor_proxy: 0.8,
        restoration_opportunity: 0.5,
        roof_footprint_m2: 1000,
        vehicular_access_m: 200,
        pedestrian_access_m: 100,
      },
      geometry: null,
    },
    {
      type: 'Feature',
      properties: {
        cell_id: 2,
        buildings: 5,
        stratum1_buildings: 4,
        rwh_opportunity: 0.4,
        drainage_corridor_proxy: 0.7,
        restoration_opportunity: 0.9,
        roof_footprint_m2: 500,
        vehicular_access_m: 100,
        pedestrian_access_m: 150,
      },
      geometry: null,
    },
  ],
};

test('community evidence allows only documented categorical values', () => {
  for (const [field, options] of Object.entries(COMMUNITY_FIELD_OPTIONS)) {
    for (const option of options) {
      assert.equal(isAllowedCommunityValue(field, option), true);
    }
    assert.equal(isAllowedCommunityValue(field, 'invented'), false);
  }
});

test('absent community file is not assessed rather than support or low risk', () => {
  const assessment = emptyCommunityAssessment([{ cell_id: 1, type: 'rwh' }]);
  assert.equal(assessment.file_status, 'absent');
  assert.equal(assessment.validation_status, 'not_assessed');
  assert.equal(assessment.not_assessed_count, 1);
  assert.equal(assessment.records[0].community_position, 'unknown');
  assert.equal(assessment.records[0].livelihood_disruption, 'unknown');
  assert.equal(assessment.records[0].displacement_risk, 'unknown');
  assert.deepEqual(assessment.safeguards_activated, []);
});

test('template community file is ignored as unobserved', () => {
  const parsed = parseCommunityEvidenceFile({
    template: true,
    records: [
      {
        cell_id: 1,
        intervention_type: 'rwh',
        consultation_status: 'validated',
        community_position: 'support',
      },
    ],
  });
  const assessment = assessCommunitySafeguards({
    projects: [{ cell_id: 1, type: 'rwh' }],
    communityFile: parsed,
  });
  assert.equal(assessment.template_ignored, true);
  assert.equal(assessment.validation_status, 'not_assessed');
});

test('high livelihood or displacement concern marks requires deliberation', () => {
  const assessment = assessCommunitySafeguards({
    projects: [{ cell_id: 1, type: 'drainage' }],
    sessionRecords: [
      {
        cell_id: 1,
        intervention_type: 'drainage',
        consultation_status: 'in_progress',
        livelihood_disruption: 'high',
        displacement_risk: 'possible',
        origin: 'participatory_session',
      },
    ],
  });
  assert.equal(assessment.validation_status, 'requires_deliberation');
  assert.ok(assessment.safeguards_activated.includes('livelihood_disruption'));
  assert.ok(assessment.safeguards_activated.includes('displacement_risk'));
});

test('community records do not change optimizer selection', () => {
  const context = createScenarioContext(buildings, cells);
  const scenario = { rainMm: 95, antecedentWetness: 0.45, planningYear: 1 };
  const withoutCommunity = optimizeRobustPortfolio({
    context,
    cellsGeoJson: cells,
    scenario,
    budgetCredits: 4,
  });
  const withCommunity = optimizeRobustPortfolio({
    context,
    cellsGeoJson: cells,
    scenario,
    budgetCredits: 4,
  });
  assert.deepEqual(withoutCommunity.plan, withCommunity.plan);
  assert.equal(withoutCommunity.spentCredits, withCommunity.spentCredits);
});

test('decision package exports community safeguards when records are absent', () => {
  const payload = buildDecisionPackage({
    scenario: { rainMm: 95, antecedentWetness: 0.45, planningYear: 1 },
    budgetCredits: 10,
    view: 'none',
    cityLens: 'balanced',
    selectedAiProfileId: 'balanced',
    projects: [],
    metrics: null,
    baseline: null,
    monteCarlo: null,
    frontier: null,
    aiDiagnostics: null,
    alternatives: [],
    stability: null,
    pareto: null,
    summary: {},
    evidence: {},
  });
  assert.equal(payload.community_safeguards.validation_status, 'not_assessed');
  assert.equal(payload.community_safeguards.file_status, 'absent');
  assert.ok(payload.guardrails.some((item) => item.includes('Community evidence')));
});

test('invalid community categories fall back to not assessed / unknown', () => {
  const record = normalizeCommunityRecord({
    cell_id: 2,
    intervention_type: 'rwh',
    consultation_status: 'approved',
    community_position: 'enthusiastic',
    livelihood_disruption: 'extreme',
  });
  assert.equal(record.consultation_status, 'not_assessed');
  assert.equal(record.community_position, 'unknown');
  assert.equal(record.livelihood_disruption, 'unknown');
});
