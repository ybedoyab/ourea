import assert from 'node:assert/strict';
import test from 'node:test';
import { plainPresetCaption, rainfallChip, rainfallHeadline } from '../src/config/climateCopy.js';
import { buildDecisionBrief } from '../src/domain/decisionBrief.js';
import { buildDecisionBriefPdf } from '../src/domain/decisionBriefPdf.js';
import { createPdf } from '../src/domain/pdfDocument.js';
import { googleEarthLookUrl, googleMapsSearchUrl } from '../src/domain/placeLinks.js';
import { fallPose } from '../src/domain/hillsideWarning.js';
import {
  cellSimulatorUrl,
  decodePlan,
  encodePlan,
  parseSessionHash,
  sessionHash,
} from '../src/domain/sessionLink.js';

test('end-user rainfall copy does not mention CHIRPS', () => {
  const climate = { climatology_period: { label: '1991-2020' }, source_name: 'CHIRPS v3.0 Final' };
  assert.match(rainfallHeadline(climate), /Observed rainfall/);
  assert.doesNotMatch(rainfallHeadline(climate), /CHIRPS/i);
  assert.doesNotMatch(rainfallChip(climate, { presetId: 'typical_wet' }), /CHIRPS/i);
  assert.match(
    plainPresetCaption({ precipitation_mm: 118.8, accumulation_window_days: 15, percentile: 75 }),
    /wetter than 3 in 4/,
  );
});

test('decision brief stays in plain language and keeps a specialist annex', () => {
  const brief = buildDecisionBrief({
    generated_at: '2026-08-28T15:00:00Z',
    selected_ai_policy: 'balanced',
    budget: { spent: 10, available: 10 },
    portfolio: [
      { cell_id: 12, type: 'rwh' },
      { cell_id: 18, type: 'drainage' },
    ],
    action_footprint: {
      planning_cells_targeted: 2,
      cadastral_buildings_in_targeted_cells: 40,
      high_hazard_buildings_in_targeted_cells: 11,
      population_proxy_in_targeted_cells: 320,
    },
    uncertainty: { benefit_proxy_p10: 8.2, median: 10, benefit_proxy_p90: 12 },
    community_safeguards: { validation_status: 'not_assessed' },
    climate_context: {
      source_name: 'CHIRPS v3.0 Final',
      climatology_period: { label: '1991-2020' },
    },
    scenario: { preset_id: 'typical_wet' },
    reproducible_id: 'ourea-test',
  });
  assert.match(brief.recommendation, /Recommend 2 interventions/);
  assert.doesNotMatch(brief.recommendation, /CHIRPS/i);
  assert.doesNotMatch(brief.rainfall, /CHIRPS/i);
  assert.match(brief.nextSteps[0], /meeting/);
  assert.match(brief.phases[0].title, /Convene/);
  assert.match(brief.team.kickoff, /12–20/);
  assert.match(brief.technicalNote, /CHIRPS/);
  assert.equal(brief.phases.some((phase) => /restoration/i.test(phase.title)), false);
  assert.equal(brief.phases.some((phase) => /drainage/i.test(phase.title)), true);
  assert.match(brief.costing.copNote, /not Colombian pesos/i);
  assert.equal(brief.costing.rows.some((row) => row.type === 'rwh'), true);
  assert.match(brief.costing.ifNothing, /does not predict houses collapsing/);
  assert.match(brief.simulatorUrl, /ourea/);
});

test('decision brief names hillside cells and skips empty restoration', async () => {
  const brief = buildDecisionBrief({
    generated_at: '2026-08-28T15:00:00Z',
    selected_ai_policy: 'balanced',
    budget: { spent: 4, available: 10 },
    portfolio: [
      { cell_id: 1, type: 'rwh' },
      { cell_id: 35, type: 'drainage' },
    ],
    action_footprint: {
      planning_cells_targeted: 2,
      cadastral_buildings_in_targeted_cells: 168,
      high_hazard_buildings_in_targeted_cells: 168,
      population_proxy_in_targeted_cells: 569,
    },
    community_safeguards: { validation_status: 'not_assessed' },
    climate_context: { source_name: 'CHIRPS v3.0 Final', climatology_period: { label: '1991-2020' } },
  }, {
    cells: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            cell_id: 1,
            buildings: 92,
            households_proxy: 82,
            population_proxy: 257,
            mean_slope_deg: 26,
            high_hazard_buildings: 92,
            vehicular_access_m: 164,
            pedestrian_access_m: 128,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-75.53967, 6.25036],
              [-75.53967, 6.25109],
              [-75.54040, 6.25109],
              [-75.54040, 6.25036],
              [-75.53967, 6.25036],
            ]],
          },
        },
        {
          type: 'Feature',
          properties: {
            cell_id: 35,
            buildings: 76,
            households_proxy: 94,
            population_proxy: 312,
            mean_slope_deg: 32,
            high_hazard_buildings: 76,
            vehicular_access_m: 246,
            pedestrian_access_m: 31,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-75.54041, 6.25398],
              [-75.54041, 6.25470],
              [-75.54114, 6.25470],
              [-75.54114, 6.25398],
              [-75.54041, 6.25398],
            ]],
          },
        },
      ],
    },
  });
  assert.match(brief.projects[0].place, /lower slope/);
  assert.match(brief.projects[0].place, /Llanaditas No\. 2/);
  assert.match(brief.projects[1].place, /upper slope/);
  assert.match(brief.projects[1].place, /western/);
  const body = new TextDecoder().decode(new Uint8Array(await buildDecisionBriefPdf(brief).arrayBuffer()));
  assert.match(body, /80 m planning square/);
  assert.match(body, /Google Maps/);
  assert.match(body, /Google Earth/);
  assert.match(body, /maps\/search/);
  assert.match(body, /earth\.google\.com/);
  assert.match(brief.projects[0].mapsUrl, /maps\/search/);
  assert.match(brief.projects[1].earthUrl, /earth\.google\.com/);
  assert.doesNotMatch(body, /Stabilize slopes/);
  assert.doesNotMatch(body, /This portfolio has no restoration/);
});

test('decision brief PDF is a valid PDF document', async () => {
  const brief = buildDecisionBrief({
    generated_at: '2026-08-28T15:00:00Z',
    selected_ai_policy: 'balanced',
    budget: { spent: 4, available: 10 },
    portfolio: [{ cell_id: 7, type: 'restoration' }],
    action_footprint: {
      planning_cells_targeted: 1,
      cadastral_buildings_in_targeted_cells: 12,
      high_hazard_buildings_in_targeted_cells: 4,
      population_proxy_in_targeted_cells: 80,
    },
    community_safeguards: { validation_status: 'community_reviewed' },
    climate_context: { source_name: 'CHIRPS v3.0 Final', climatology_period: { label: '1991-2020' } },
    scenario: { preset_id: 'high_rainfall' },
    reproducible_id: 'ourea-pdf',
  });
  const blob = buildDecisionBriefPdf(brief);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const head = new TextDecoder().decode(bytes.slice(0, 8));
  assert.equal(head.startsWith('%PDF-1.'), true);
  const body = new TextDecoder().decode(bytes);
  assert.match(body, /Implementation proposal/);
  assert.match(body, /OUREA/);
  assert.match(body, /Contents/);
  assert.match(body, /Community and safeguards/);
  assert.match(body, /How to implement this/);
  assert.match(body, /People required/);
  assert.match(body, /Site work orders/);
  assert.match(body, /On the hillside/);
  assert.match(body, /First walk/);
  assert.match(body, /How to do it/);
  assert.match(body, /Where the budget would go/);
  assert.match(body, /Ourea map/);
  assert.match(body, /houses lean, houses fall/);
  assert.match(body, /Planning credits compare options/);
  assert.match(body, /\/S \/URI/);
  assert.match(body, /area=llanaditas/);
  assert.match(body, /credit/);
  assert.match(body, /Stabilize slopes/);
  assert.match(body, /Page 1 of /);
  assert.match(body, /\/Subtype \/Link/);
  assert.match(body, /\/S \/GoTo/);
  assert.doesNotMatch(body, /\(Cover\)/);
  assert.doesNotMatch(body, /SEARCH NETWORK/);
  assert.doesNotMatch(body, /P10 keep/);
  assert.doesNotMatch(body, /neural net/i);
  assert.doesNotMatch(body, /houses will collapse/i);
  assert.doesNotMatch(body, /collapse in year/i);
  assert.doesNotMatch(body, /This portfolio has no restoration/);
  assert.doesNotMatch(body.split('Specialist annex')[0], /CHIRPS/);
});

test('decision brief PDF paginates long copy instead of clipping it', async () => {
  const brief = buildDecisionBrief({
    generated_at: '2026-08-28T15:00:00Z',
    selected_ai_policy: 'balanced',
    budget: { spent: 10, available: 10 },
    portfolio: [
      { cell_id: 1, type: 'rwh' },
      { cell_id: 2, type: 'rwh' },
      { cell_id: 28, type: 'drainage' },
      { cell_id: 29, type: 'drainage' },
      { cell_id: 35, type: 'restoration' },
    ],
    action_footprint: {
      planning_cells_targeted: 5,
      cadastral_buildings_in_targeted_cells: 406,
      high_hazard_buildings_in_targeted_cells: 120,
      population_proxy_in_targeted_cells: 1234,
    },
    uncertainty: { benefit_proxy_p10: 69.6, median: 80, benefit_proxy_p90: 92 },
    community_safeguards: { validation_status: 'not_assessed' },
    climate_context: { source_name: 'CHIRPS v3.0 Final', climatology_period: { label: '1991-2020' } },
    scenario: { preset_id: 'typical_wet' },
    reproducible_id: 'ourea-34b88ecf',
  });
  brief.nextSteps = Array.from({ length: 12 }, (_, index) => (
    `${index + 1}. Use this briefing in planning meetings with community leaders, municipal staff and the design team so the recommended works stay tied to the hillside they were chosen for.`
  ));
  brief.caveats = Array.from({ length: 10 }, () => (
    'Benefit numbers are planning proxies, not people saved or losses avoided, and they must be read with the community and engineering caveats in this brief.'
  ));
  const blob = buildDecisionBriefPdf(brief);
  const body = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));
  assert.match(body, /Community and safeguards/);
  assert.match(body, /Read this carefully/);
  assert.match(body, /\/Count [2-9]/);
  assert.doesNotMatch(body, /This portfolio has no drainage/);
});

test('pdf writer encodes Spanish letters and middle dots', async () => {
  const pdf = createPdf();
  pdf.text('Medellín · 28 August 2026', 40, 80);
  const body = new TextDecoder().decode(new Uint8Array(await pdf.toBlob().arrayBuffer()));
  assert.match(body, /Medell\\355n/);
  assert.match(body, /\\267/);
  assert.doesNotMatch(body, /Medell\?/);
});

test('pdf writer emits a catalog and page', async () => {
  const pdf = createPdf();
  pdf.text('Hello Medellín', 40, 80, { size: 14, bold: true });
  const blob = pdf.toBlob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  assert.match(new TextDecoder().decode(bytes), /\/Type \/Catalog/);
});

test('session links encode a cell and the active plan', () => {
  const plan = [
    { cell_id: 12, type: 'rwh' },
    { cell_id: 35, type: 'drainage' },
  ];
  assert.equal(encodePlan(plan), '12:rwh,35:drainage');
  assert.deepEqual(decodePlan('12:rwh,35:drainage'), plan);
  assert.equal(parseSessionHash('').cellId, null);
  assert.equal(parseSessionHash('#area=llanaditas').cellId, null);
  const parsed = parseSessionHash('#area=llanaditas&cell=35&plan=12:rwh,35:drainage');
  assert.equal(parsed.areaId, 'llanaditas');
  assert.equal(parsed.cellId, 35);
  assert.deepEqual(parsed.plan, plan);
  assert.match(sessionHash({ cellId: 35, plan }), /area=llanaditas/);
  assert.match(cellSimulatorUrl(35, 'https://ybedoyab.github.io/ourea/', plan), /#area=llanaditas/);
  assert.match(cellSimulatorUrl(35, 'https://ybedoyab.github.io/ourea/', plan), /cell=35/);
});

test('place links point at Google Maps and Google Earth', () => {
  const maps = googleMapsSearchUrl(6.2542, -75.5408);
  const earth = googleEarthLookUrl(6.2542, -75.5408);
  assert.match(maps, /google\.com\/maps\/search/);
  assert.match(maps, /6\.25420/);
  assert.match(earth, /earth\.google\.com\/web/);
  assert.match(earth, /-75\.54080/);
});

test('hillside warning houses fall further as time advances', () => {
  const house = { delay: 0 };
  const early = fallPose(0.1, house);
  const late = fallPose(0.95, house);
  assert.equal(early.lean < late.lean, true);
  assert.equal(early.dy < late.dy, true);
  assert.equal(late.cracked, true);
});
