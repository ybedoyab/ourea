import { expect, test } from '@playwright/test';

const IGNORE_CONSOLE = /404|Failed to load|community_evidence|replay_timeline|terrain\/|favicon|demotiles|cartocdn|glyphs|AJAXError|Failed to fetch/i;

test('Ourea smoke: city screen, sandbox, evidence, export', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORE_CONSOLE.test(text)) return;
    consoleErrors.push(text);
  });

  await page.goto('/');
  await expect(page.getByTestId('open-sandbox')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('heading', { name: /Screen the city/i })).toBeVisible();

  await page.getByTestId('open-sandbox').click();
  await expect(page.getByTestId('select-cell')).toBeVisible();
  await expect(page.getByTestId('select-cell').locator('option')).toHaveCount(50);
  await expect(page.getByRole('heading', { name: /From climate risk to robust action/i })).toBeVisible();

  await page.getByTestId('select-cell').selectOption({ index: 1 });
  await page.getByTestId('select-type-rwh').click();
  await page.getByTestId('add-intervention').click();
  await expect(page.getByTestId('view-user')).toBeEnabled();

  await page.getByTestId('generate-alternatives').click();
  await expect(page.getByTestId('select-profile-balanced')).toBeVisible({ timeout: 120000 });
  await page.getByTestId('select-profile-equity').click();
  await expect(page.getByTestId('view-ai')).toBeEnabled();
  await page.getByTestId('view-user').click();

  await page.getByTestId('analyze-frontier').click();
  await expect(page.locator('.frontier-row').first()).toBeVisible({ timeout: 120000 });
  await page.getByTestId('analyze-stability').click();
  await expect(page.locator('.stability-row').first()).toBeVisible({ timeout: 120000 });

  await page.getByTestId('community-project').selectOption({ index: 1 });
  await page.getByTestId('community-consultation_status').selectOption('in_progress');
  await page.getByTestId('community-submit').click();
  await expect(page.getByTestId('community-status')).toHaveAttribute('data-status', 'incomplete');

  await page.getByTestId('community-consultation_status').selectOption('validated');
  await page.getByTestId('community-community_position').selectOption('support');
  await page.getByTestId('community-livelihood_disruption').selectOption('low');
  await page.getByTestId('community-maintenance_capacity').selectOption('medium');
  await page.getByTestId('community-displacement_risk').selectOption('none');
  await page.getByTestId('community-accessibility_concern').selectOption('none');
  await page.getByTestId('community-evidence_type').selectOption('participatory_input');
  await page.getByTestId('community-submit').click();
  await expect(page.getByTestId('community-status')).toHaveAttribute('data-status', 'community_reviewed');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-package').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
