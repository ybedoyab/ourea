import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  VIEWPORTS,
  attachErrorGuards,
  assertNoHorizontalOverflow,
} from './errorAllowlist.js';

async function completeCommunityRecord(page) {
  await page.getByTestId('community-project').selectOption({ index: 1 });
  await page.getByTestId('community-consultation_status').selectOption('validated');
  await page.getByTestId('community-community_position').selectOption('support');
  await page.getByTestId('community-livelihood_disruption').selectOption('low');
  await page.getByTestId('community-maintenance_capacity').selectOption('medium');
  await page.getByTestId('community-displacement_risk').selectOption('none');
  await page.getByTestId('community-accessibility_concern').selectOption('none');
  await page.getByTestId('community-evidence_type').selectOption('participatory_input');
  await page.getByTestId('community-source').fill('Guided demo metadata');
  await page.getByTestId('community-as-of').fill('2026-08-27');
  await page.getByTestId('community-submit').click();
}

async function runDecisionJourney(page, { generate = true } = {}) {
  const guards = attachErrorGuards(page);
  await page.goto('/');
  await expect(page.getByTestId('open-sandbox')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('heading', { name: /Screen the city/i })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByTestId('open-sandbox').click();
  await expect(page.getByTestId('select-cell')).toBeVisible();
  await expect(page.getByTestId('climate-context-panel')).toBeVisible();
  await expect(page.getByText('Observed climate context')).toBeVisible();
  await expect(page.getByTestId('climate-source-link')).toBeVisible();
  await page.getByTestId('climate-preset-high_rainfall').click();
  await expect(page.getByTestId('climate-preset-high_rainfall')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('climate-method').locator('summary').click();
  await expect(page.getByText(/does not issue real-time forecasts/i).first()).toBeVisible();

  await page.getByTestId('select-cell').selectOption({ index: 1 });
  await page.getByTestId('select-type-rwh').click();
  await page.getByTestId('add-intervention').click();
  await expect(page.getByTestId('view-user')).toBeEnabled();

  if (generate) {
    await page.getByTestId('generate-alternatives').click();
    await expect(page.getByTestId('select-profile-balanced')).toBeVisible({ timeout: 120000 });
    await page.getByTestId('select-profile-equity').click();
    await page.getByTestId('select-profile-access').click();
    await page.getByTestId('select-profile-low_regret').click();
    await page.getByTestId('select-profile-balanced').click();
    await expect(page.getByTestId('view-ai')).toBeEnabled();

    await page.getByTestId('analyze-benchmark').click();
    await expect(page.getByTestId('breakage-combination-count')).toBeVisible({ timeout: 120000 });
    await expect(page.getByTestId('breakage-combination-count')).toContainText('scenario combinations');
    await expect(page.getByTestId('breakage-combination-count')).not.toContainText('grid cells');

    await page.getByTestId('analyze-frontier').click();
    await expect(page.locator('.frontier-row').first()).toBeVisible({ timeout: 120000 });
    await page.getByTestId('analyze-pareto').click();
    await expect(page.locator('.pareto-row').first()).toBeVisible({ timeout: 120000 });
  }

  await expect(page.getByTestId('plan-alignment')).toBeVisible();
  await expect(page.getByTestId('alignment-source-granizal-2025-mechanism')).toBeVisible();
  await expect(page.getByTestId('alignment-source-granizal-2025-mechanism')).not.toHaveText(/https?:\/\//);

  await page.getByTestId('view-user').click();
  await page.getByTestId('community-project').selectOption({ index: 1 });
  await page.getByTestId('community-consultation_status').selectOption('in_progress');
  await page.getByTestId('community-submit').click();
  await expect(page.getByTestId('community-status')).toHaveAttribute('data-status', 'incomplete');
  await completeCommunityRecord(page);
  await expect(page.getByTestId('community-status')).toHaveAttribute('data-status', 'community_reviewed');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-package').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const payload = JSON.parse(await readFile(downloadPath, 'utf8'));
  expect(payload.schema).toBe('ourea-decision-package');
  expect(payload.schema_version).toBe(2);
  expect(payload.climate_context.source_name).toMatch(/CHIRPS/i);
  expect(payload.scenario.antecedent_rainfall_percentile).toBeGreaterThanOrEqual(0);
  expect(payload.plan_alignment.entries.length).toBeGreaterThan(0);
  expect(payload.community_safeguards.validation_status).toBeTruthy();
  expect(payload.reproducible_id).toMatch(/^ourea-/);
  expect(payload.schema_versions.climate_context).toBe(1);

  await assertNoHorizontalOverflow(page);
  guards.assertClean();
  return payload;
}

test.describe('desktop', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('city screen to export', async ({ page }) => {
    await runDecisionJourney(page, { generate: true });
  });

  test('guided demo is reproducible', async ({ page }) => {
    const guards = attachErrorGuards(page);
    await page.goto('/');
    await page.getByTestId('run-guided-demo').click();
    await expect(page.getByTestId('select-profile-balanced')).toBeVisible({ timeout: 180000 });
    await expect(page.getByTestId('breakage-combination-count')).toBeVisible({ timeout: 180000 });
    await expect(page.getByTestId('climate-context-panel')).toBeVisible();
    guards.assertClean();
  });

  test('keyboard can open the proving ground', async ({ page }) => {
    const guards = attachErrorGuards(page);
    await page.goto('/');
    await expect(page.getByTestId('open-sandbox')).toBeVisible({ timeout: 60000 });
    await page.getByTestId('open-sandbox').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('climate-context-panel')).toBeVisible();
    await page.keyboard.press('Tab');
    guards.assertClean();
  });
});

test.describe('tablet', () => {
  test.use({ viewport: VIEWPORTS.tablet });
  test('responsive decision path', async ({ page }) => {
    await runDecisionJourney(page, { generate: true });
  });
});

test.describe('mobile', () => {
  test.use({ viewport: VIEWPORTS.mobile });
  test('390x844 has no overflow and covers climate plus export', async ({ page }) => {
    await runDecisionJourney(page, { generate: false });
  });
});

test('explore mode remains available beside observational presets', async ({ page }) => {
  const guards = attachErrorGuards(page);
  await page.goto('/');
  await page.getByTestId('open-sandbox').click();
  await expect(page.getByTestId('climate-preset-typical_wet')).toBeVisible();
  await page.locator('#rain-depth').fill('210');
  await expect(page.getByTestId('preset-mode')).toContainText('Explore');
  guards.assertClean();
});

test('built app serves local data without third-party APIs', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (
      url.startsWith('http://127.0.0.1')
      || url.startsWith('http://localhost')
      || url.startsWith('ws://127.0.0.1')
      || url.startsWith('ws://localhost')
    ) {
      return route.continue();
    }
    return route.abort();
  });
  await page.goto('/');
  await expect(page.getByTestId('open-sandbox')).toBeVisible({ timeout: 60000 });
  await page.getByTestId('open-sandbox').click();
  await expect(page.getByTestId('climate-context-panel')).toBeVisible();
  await expect(page.getByTestId('climate-facts')).toContainText('CHIRPS');
});

test('published demo', async ({ page }) => {
  const url = process.env.OUREA_DEMO_URL;
  test.skip(!url, 'OUREA_DEMO_URL not set');
  const guards = attachErrorGuards(page);
  await page.goto(url);
  await expect(page.getByTestId('open-sandbox')).toBeVisible({ timeout: 60000 });
  await assertNoHorizontalOverflow(page);
  guards.assertClean();
});
