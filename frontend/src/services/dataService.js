import scientificGuardrails from '../config/scientificGuardrails.json' with { type: 'json' };
import { OPTIONAL_DATA_FILES, REQUIRED_DATA_FILES } from '../config/dataPaths.js';

async function fetchJson(url, signal, { optional = false, optionalParse = 'throw' } = {}) {
  const response = await fetch(url, { signal });
  if (optional && response.status === 404) {
    return optionalParse === 'invalid' ? { __absent: true } : null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }

  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const spaFallback = /^\s*</.test(body);
    if (optional && (optionalParse === 'absent' || spaFallback)) {
      return spaFallback && optionalParse === 'invalid' ? { __absent: true } : null;
    }
    if (optional && optionalParse === 'invalid') {
      return { __invalid: true, error: message };
    }
    throw new Error(`Failed to parse ${url} as JSON: ${message}`);
  }
}

export async function loadOureaData(signal) {
  const requiredEntries = await Promise.all(
    Object.entries(REQUIRED_DATA_FILES).map(async ([key, url]) => [
      key,
      await fetchJson(url, signal, { optional: false }),
    ]),
  );
  const required = Object.fromEntries(requiredEntries);
  const communityEvidence = await fetchJson(OPTIONAL_DATA_FILES.communityEvidence, signal, {
    optional: true,
    optionalParse: 'invalid',
  });

  return {
    ...required,
    communityEvidence: communityEvidence?.__absent ? null : communityEvidence,
    evidence: {
      ...required.evidence,
      global_guardrails: scientificGuardrails.items,
    },
  };
}
