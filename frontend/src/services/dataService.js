import scientificGuardrails from '../config/scientificGuardrails.json' with { type: 'json' };
import { OPTIONAL_DATA_FILES, REQUIRED_DATA_FILES } from '../config/dataPaths.js';

async function fetchJson(url, signal, { optional = false } = {}) {
  const response = await fetch(url, { signal });
  if (optional && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }

  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    if (optional) return null;
    throw new Error(
      `Failed to parse ${url} as JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function loadEntries(files, signal, optional) {
  const entries = await Promise.all(
    Object.entries(files).map(async ([key, url]) => [
      key,
      await fetchJson(url, signal, { optional }),
    ]),
  );
  return Object.fromEntries(entries);
}

export async function loadOureaData(signal) {
  const [required, optional] = await Promise.all([
    loadEntries(REQUIRED_DATA_FILES, signal, false),
    loadEntries(OPTIONAL_DATA_FILES, signal, true),
  ]);
  return {
    ...required,
    ...optional,
    evidence: {
      ...required.evidence,
      global_guardrails: scientificGuardrails.items,
    },
  };
}
