import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { plainPresetCaption, rainfallChip, rainfallHeadline } from '../src/config/climateCopy.js';
import { buildDecisionBrief } from '../src/domain/decisionBrief.js';
import { buildDecisionBriefPdf } from '../src/domain/decisionBriefPdf.js';
import { createPdf } from '../src/domain/pdfDocument.js';
import { googleEarthLookUrl, googleMapsSearchUrl } from '../src/domain/placeLinks.js';
import {
  cellSimulatorUrl,
  decodePlan,
  encodePlan,
  parseSessionHash,
  sessionHash,
} from '../src/domain/sessionLink.js';
import { GUIDED_CELLS, GUIDED_PLAN, RESTORATION_PLAN, guidedPayload } from './fixtures/guidedPlan.js';

const costContext = JSON.parse(
  await readFile(fileURLToPath(new URL('../public/data/cost_context.json', import.meta.url)), 'utf8'),
);

function pdfText(bytes) {
  return new TextDecoder('latin1').decode(bytes);
}

async function pdfOf(brief) {
  return pdfText(new Uint8Array(await buildDecisionBriefPdf(brief).arrayBuffer()));
}

function pageCount(body) {
  const match = body.match(/\/Type \/Pages \/Count (\d+)/);
  return match ? Number(match[1]) : 0;
}

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
  const brief = buildDecisionBrief(guidedPayload(), { cells: GUIDED_CELLS, costContext });
  assert.match(brief.recommendation, /Recommend 2 interventions/);
  assert.doesNotMatch(brief.recommendation, /CHIRPS/i);
  assert.doesNotMatch(brief.recommendation, /planning credit/i);
  assert.doesNotMatch(brief.rainfall, /CHIRPS/i);
  assert.match(brief.pathway[0].title, /Ourea deployment/i);
  assert.match(brief.decision, /US\$0\.33–1\.39 million/);
  assert.match(brief.decision, /US\$0\.73 million/);
  assert.match(brief.technicalNote, /CHIRPS/);
  assert.match(brief.simulatorUrl, /ourea/);
  assert.equal(brief.costing.display.total.base, 730000);
});

test('decision brief names hillside cells and costing quantities', () => {
  const brief = buildDecisionBrief(guidedPayload(), { cells: GUIDED_CELLS, costContext });
  assert.match(brief.projects[0].place, /Llanaditas No\. 2/);
  assert.match(brief.projects[1].place, /Llanaditas No\. 2/);
  assert.equal(brief.projects[0].quantity, 1);
  assert.match(brief.projects[1].quantityLabel, /40 \/ 60 \/ 80 m/);
  assert.match(brief.projects[0].mapsUrl, /maps\/search/);
  assert.match(brief.projects[1].earthUrl, /earth\.google\.com/);
});

test('guided decision brief PDF is a six-page document with metadata and USD', async () => {
  const brief = buildDecisionBrief(guidedPayload(), { cells: GUIDED_CELLS, costContext });
  const blob = buildDecisionBriefPdf(brief);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 8)).startsWith('%PDF-1.'), true);
  const body = pdfText(bytes);
  assert.equal(pageCount(body), 6);
  assert.match(body, /\/Title/);
  assert.match(body, /\/Author \(Ourea\)/);
  assert.match(body, /\/Subject/);
  assert.match(body, /\/Keywords/);
  assert.match(body, /\/CreationDate \(D:20260828150000Z\)/);
  assert.match(body, /\/Lang \(en-US\)/);
  assert.match(body, /Executive decision/);
  assert.match(body, /Where and what/);
  assert.match(body, /Cost envelope/);
  assert.match(body, /Six-month implementation pathway/);
  assert.match(body, /Why early action matters/);
  assert.match(body, /Decision requested/);
  assert.match(body, /US\$/);
  assert.match(body, /pre-feasibility/);
  assert.match(body, /2026-08-28/);
  assert.match(body, /3144\.28/);
  assert.match(body, /Ourea map/);
  assert.match(body, /Google Maps/);
  assert.match(body, /Google Earth/);
  assert.match(body, /\/S \/URI/);
  assert.match(body, /ybedoyab\.github\.io\/ourea/);
  assert.match(body, /maps\/search/);
  assert.match(body, /earth\.google\.com/);
  assert.match(body, /Page 6 of 6/);
  assert.doesNotMatch(body, /Page 7 of/);
  assert.doesNotMatch(body, /\(Contents\)/);
  assert.doesNotMatch(body, /\(credit/i);
  assert.doesNotMatch(body, /planning credit/i);
  assert.doesNotMatch(body, /houses fall/i);
  assert.doesNotMatch(body, /houses lean/i);
  assert.doesNotMatch(body, /collapse/i);
  assert.doesNotMatch(body, /failure year/i);
  assert.doesNotMatch(body, /GIF/i);
  assert.doesNotMatch(body.split('Specialist annex')[0], /CHIRPS/);
});

test('AI-assisted PDF section stays on six pages and does not change USD totals', async () => {
  const { VALID_SYNTHESIS } = await import('./fixtures/aiReview.js');
  const brief = buildDecisionBrief(guidedPayload(), {
    cells: GUIDED_CELLS,
    costContext,
    aiReview: {
      readiness: { status: 'ready_for_field_validation' },
      synthesis: VALID_SYNTHESIS,
      generatedAt: '2026-08-28T12:00:00Z',
    },
  });
  const body = await pdfOf(brief);
  assert.equal(pageCount(body), 6);
  assert.match(body, /AI-assisted decision synthesis/);
  assert.match(body, /Ready for field validation/);
  assert.equal(brief.costing.display.total.base, 730000);
  assert.doesNotMatch(body, /planning credit/i);
});

test('restoration portfolio PDF still has six pages and a USD envelope', async () => {
  const brief = buildDecisionBrief(guidedPayload({
    portfolio: RESTORATION_PLAN,
    budget: { spent: 2, available: 10 },
    action_footprint: {
      planning_cells_targeted: 1,
      cadastral_buildings_in_targeted_cells: 25,
      high_hazard_buildings_in_targeted_cells: 12,
      population_proxy_in_targeted_cells: 80,
    },
    community_safeguards: { validation_status: 'community_reviewed' },
  }), { cells: GUIDED_CELLS, costContext });
  const body = await pdfOf(brief);
  assert.equal(pageCount(body), 6);
  assert.match(body, /Restoration/);
  assert.match(body, /US\$/);
  assert.match(body, /project-scale/);
  assert.doesNotMatch(body, /planning credit/i);
  assert.doesNotMatch(body, /houses fall/i);
});

test('unpriced intervention does not invent a total', async () => {
  const brief = buildDecisionBrief(guidedPayload({
    portfolio: [{ cell_id: 12, type: 'unknown' }],
  }), { cells: GUIDED_CELLS, costContext });
  assert.equal(brief.costing.complete, false);
  assert.equal(brief.costing.total, null);
  const body = await pdfOf(brief);
  assert.match(body, /Not estimable|not estimable/);
});

test('pdf writer encodes Spanish letters, metadata and a catalog', async () => {
  const pdf = createPdf({
    info: {
      title: 'Ourea test',
      author: 'Ourea',
      subject: 'Metadata check',
      keywords: ['Ourea', 'test'],
      creationDate: '2026-08-28T15:00:00Z',
      lang: 'en-US',
    },
  });
  pdf.text('Medellín · 28 August 2026', 40, 80);
  const body = pdfText(new Uint8Array(await pdf.toBlob().arrayBuffer()));
  assert.match(body, /Medell\\355n/);
  assert.match(body, /\\267/);
  assert.match(body, /\/Title \(Ourea test\)/);
  assert.match(body, /\/Author \(Ourea\)/);
  assert.match(body, /\/Lang \(en-US\)/);
  assert.match(body, /\/Type \/Catalog/);
  assert.doesNotMatch(body, /Medell\?/);
});

test('session links encode a cell and the active plan', () => {
  const plan = GUIDED_PLAN;
  assert.equal(encodePlan(plan), '12:rwh,18:drainage');
  assert.deepEqual(decodePlan('12:rwh,18:drainage'), [...plan]);
  const parsed = parseSessionHash('#area=llanaditas&cell=35&plan=12:rwh,18:drainage');
  assert.equal(parsed.areaId, 'llanaditas');
  assert.equal(parsed.cellId, 35);
  assert.match(cellSimulatorUrl(35, 'https://ybedoyab.github.io/ourea/', plan), /ybedoyab\.github\.io\/ourea\//);
  assert.match(sessionHash({ cellId: 35, plan }), /area=llanaditas/);
});

test('place links point at Google Maps and Google Earth', () => {
  const maps = googleMapsSearchUrl(6.2542, -75.5408);
  const earth = googleEarthLookUrl(6.2542, -75.5408);
  assert.match(maps, /google\.com\/maps\/search/);
  assert.match(earth, /earth\.google\.com\/web/);
});
