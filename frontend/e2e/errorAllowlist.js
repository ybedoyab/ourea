import { expect } from '@playwright/test';

export const VIEWPORTS = Object.freeze({
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
});

export function isAllowedFailedRequest(url, failureText = '') {
  if (url.includes('basemaps.cartocdn.com')) {
    return 'Optional Carto dark basemap; local GeoJSON and terrain still load.';
  }
  if (url.includes('demotiles.maplibre.org')) {
    return 'Optional MapLibre glyph atlas for labels.';
  }
  if (/\/(?:ourea\/)?terrain\/\d+\/\d+\/\d+\.png/.test(url)) {
    return 'Sparse local DEM TMS; empty tiles 404 by design.';
  }
  if (url.includes('community_evidence.json')) {
    return 'Optional participatory file; absence means not assessed.';
  }
  if (url.endsWith('/favicon.ico')) {
    return 'SVG favicon is shipped; browsers may still probe favicon.ico.';
  }
  if (failureText.includes('net::ERR_ABORTED') && url.includes('terrain/')) {
    return 'MapLibre aborts in-flight DEM tiles during camera moves.';
  }
  return null;
}

export function isAllowedConsoleError(text) {
  if (text.includes('basemaps.cartocdn.com')) return true;
  if (text.includes('demotiles.maplibre.org')) return true;
  if (/terrain\/\d+\/\d+\/\d+\.png/.test(text) && /404|AJAXError|Failed to fetch/.test(text)) {
    return true;
  }
  if (text.includes('community_evidence.json') && /404/.test(text)) return true;
  if (text.includes('favicon.ico')) return true;
  return false;
}

export function attachErrorGuards(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (isAllowedConsoleError(text)) return;
    consoleErrors.push(text);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? '';
    if (isAllowedFailedRequest(url, failure)) return;
    failedRequests.push(`${url} :: ${failure}`);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.ok()) return;
    if (isAllowedFailedRequest(url, String(response.status()))) return;
    const origin = page.url();
    const own = url.startsWith(new URL(origin).origin);
    if (own && response.status() >= 400) {
      failedRequests.push(`${url} :: HTTP ${response.status()}`);
    }
  });

  return {
    assertClean() {
      expect(pageErrors, pageErrors.join('\n')).toEqual([]);
      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
      expect(failedRequests, failedRequests.join('\n')).toEqual([]);
    },
  };
}

export async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, 'horizontal overflow').toBe(false);
}
