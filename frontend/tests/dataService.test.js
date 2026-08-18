import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLaderaData } from '../src/services/dataService.js';

function response({ status = 200, body = '{}' } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return body;
    },
  };
}

test('optional replay tolerates SPA HTML fallback without failing required data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('replay_timeline.json')) {
      return response({ body: '<!doctype html><html></html>' });
    }
    return response({ body: '{}' });
  };

  try {
    const data = await loadLaderaData();
    assert.equal(data.replay, null);
    assert.deepEqual(data.buildings, {});
    assert.deepEqual(data.evidence, {});
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('malformed required JSON fails visibly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('buildings.geojson')) {
      return response({ body: 'not-json' });
    }
    return response({ body: '{}' });
  };

  try {
    await assert.rejects(
      () => loadLaderaData(),
      /Failed to parse \/data\/buildings\.geojson as JSON/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('required HTTP errors propagate with the source path', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('hazard.geojson')) {
      return response({ status: 503, body: 'unavailable' });
    }
    return response({ body: '{}' });
  };

  try {
    await assert.rejects(
      () => loadLaderaData(),
      /Failed to load \/data\/hazard\.geojson: HTTP 503/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
