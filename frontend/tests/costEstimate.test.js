import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  estimatePortfolioCost,
  formatUsd,
  formatUsdMillionRange,
  rwhParticipatingSystems,
  roundUsd,
} from '../src/domain/costEstimate.js';
import { GUIDED_CELLS, GUIDED_PLAN, RESTORATION_PLAN } from './fixtures/guidedPlan.js';

const costContext = JSON.parse(
  await readFile(fileURLToPath(new URL('../public/data/cost_context.json', import.meta.url)), 'utf8'),
);

test('RWH quantity follows the participation prior', () => {
  assert.equal(rwhParticipatingSystems(4, 0.25), 1);
  assert.equal(rwhParticipatingSystems(47, 0.25), 12);
  assert.equal(rwhParticipatingSystems(0, 0.25), 1);
});

test('guided RWH plus drainage envelope is near US$328k / 730k / 1.39m', () => {
  const estimate = estimatePortfolioCost({
    portfolio: GUIDED_PLAN,
    cells: GUIDED_CELLS,
    costContext,
  });
  assert.equal(estimate.complete, true);
  assert.equal(estimate.ordered, true);
  assert.equal(estimate.lines.find((line) => line.type === 'rwh').assumedQuantity, 1);
  const drainage = estimate.lines.find((line) => line.type === 'drainage');
  assert.equal(drainage.assumedQuantity, 60);
  assert.match(drainage.quantityLabel, /40\/60\/80/);
  assert.equal(estimate.display.total.low, 328000);
  assert.equal(estimate.display.total.base, 730000);
  assert.equal(estimate.display.total.high, 1390000);
  assert.equal(estimate.lines.find((line) => line.type === 'rwh').display.base, 780);
  assert.equal(estimate.lines.find((line) => line.type === 'rwh').display.low, 550);
  assert.equal(estimate.display.total.low < estimate.display.total.base, true);
  assert.equal(estimate.display.total.base < estimate.display.total.high, true);
  assert.ok(estimate.sourceIds.includes('rwh_santa_elena_1000l_2023_budget_ceiling'));
  assert.ok(estimate.sourceIds.some((id) => id.startsWith('drainage_scale_')));
  assert.equal(formatUsd(estimate.display.total.base), 'US$730,000');
  assert.equal(formatUsdMillionRange(328000, 1390000), 'US$0.33–1.39 million');
});

test('drainage scenarios use 40/60/80 m independently of cell width', () => {
  const estimate = estimatePortfolioCost({
    portfolio: [{ cell_id: 18, type: 'drainage' }],
    cells: GUIDED_CELLS,
    costContext,
  });
  const line = estimate.lines[0];
  const rates = costContext.interventions.drainage.usd_per_reported_m;
  assert.equal(line.low, 40 * rates.low);
  assert.equal(line.base, 60 * rates.base);
  assert.equal(line.high, 80 * rates.high);
});

test('RWH quantity is dynamic with building count', () => {
  const one = estimatePortfolioCost({
    portfolio: [{ cell_id: 12, type: 'rwh' }],
    cells: GUIDED_CELLS,
    costContext,
  });
  const many = estimatePortfolioCost({
    portfolio: [{ cell_id: 18, type: 'rwh' }],
    cells: GUIDED_CELLS,
    costContext,
  });
  assert.equal(one.lines[0].assumedQuantity, 1);
  assert.equal(many.lines[0].assumedQuantity, 12);
  assert.equal(many.total.base > one.total.base, true);
});

test('restoration is a project-scale package, not a USD/m2 rate', () => {
  const estimate = estimatePortfolioCost({
    portfolio: RESTORATION_PLAN,
    cells: GUIDED_CELLS,
    costContext,
  });
  assert.equal(estimate.complete, true);
  assert.equal(estimate.lines[0].assumedQuantity, 1);
  assert.equal(estimate.display.total.base, roundUsd(196000 * 1.075));
  assert.equal(estimate.lines[0].evidenceTier, 'low');
  assert.equal(estimate.lines[0].assumedQuantity, 1);
  assert.match(estimate.lines[0].quantityNote, /not a USD\/m/);
});

test('unpriced interventions refuse a total', () => {
  const estimate = estimatePortfolioCost({
    portfolio: [{ cell_id: 12, type: 'unknown' }],
    cells: GUIDED_CELLS,
    costContext,
  });
  assert.equal(estimate.complete, false);
  assert.equal(estimate.total, null);
  assert.ok(estimate.unpriced.includes('unknown'));
});

test('missing cost context refuses a total', () => {
  const estimate = estimatePortfolioCost({
    portfolio: GUIDED_PLAN,
    cells: GUIDED_CELLS,
    costContext: null,
  });
  assert.equal(estimate.complete, false);
  assert.equal(estimate.total, null);
});

test('rounding is stable and presentation-only', () => {
  assert.equal(roundUsd(328053.8), 328000);
  assert.equal(roundUsd(729723.47), 730000);
  assert.equal(roundUsd(1389651.41), 1390000);
  const estimate = estimatePortfolioCost({
    portfolio: GUIDED_PLAN,
    cells: GUIDED_CELLS,
    costContext,
  });
  assert.notEqual(estimate.total.base, estimate.display.total.base);
  assert.ok(Math.abs(estimate.total.base - 729723) < 20);
});
