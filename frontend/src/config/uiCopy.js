export const CITY_LENSES = Object.freeze({
  exposure: {
    label: 'Exposure',
    rankField: 'rank_exposure',
    scoreField: 'priority_exposure',
    question: 'Where are the most people exposed to mapped hazard?',
    description: 'Projected 2026 population × official mass-movement hazard coverage.',
  },
  balanced: {
    label: 'Balanced',
    rankField: 'rank_balanced',
    scoreField: 'priority_balanced',
    question: 'Where do exposure and socioeconomic vulnerability overlap?',
    description: '75% hazard-weighted exposure + 25% socioeconomic vulnerability (IMCV).',
  },
  equity: {
    label: 'Equity',
    rankField: 'rank_equity',
    scoreField: 'priority_equity',
    question: 'Where does vulnerability deserve greater decision weight?',
    description: '55% hazard-weighted exposure + 45% socioeconomic vulnerability (IMCV).',
  },
});

export const INTERVENTION_COPY = Object.freeze({
  rwh: {
    mechanism: 'Capture roof runoff before it reaches the hillside.',
    evidence: 'Local household-system precedent; effect remains a development prior.',
  },
  drainage: {
    mechanism: 'Move concentrated water away from exposed hillside cells.',
    evidence: 'Official drainage-corridor spatial proxy; effect remains a development prior.',
  },
  restoration: {
    mechanism: 'Stabilize slopes with vegetation and bioengineering.',
    evidence: 'Spatial opportunity proxy; effect remains a development prior and matures over 3 years.',
  },
});

export const POLICY_COPY = Object.freeze({
  balanced: 'Balances robust exposure reduction with modest equity and access weighting.',
  equity: 'Places substantially more decision weight on cells with high stratum-1 exposure.',
  access: 'Places substantially more decision weight on cells supporting mapped hillside access.',
  low_regret: 'Favors fewer projects whose marginal benefit remains defensible in adverse development draws.',
});

export const STABILITY_BANDS = Object.freeze({
  high: { min: 10 / 12, label: 'High stability' },
  moderate: { min: 6 / 12, label: 'Moderate stability' },
  sensitive: { min: 0, label: 'Sensitive' },
});

export const EVIDENCE_GROUPS = Object.freeze([
  {
    id: 'observed',
    label: 'Observed / official',
    ids: ['terrain', 'hazard', 'buildings', 'city_population_2026', 'city_imcv_2023'],
  },
  {
    id: 'proxies',
    label: 'Planning proxies',
    ids: ['population', 'access', 'socioeconomic', 'city_priority_screen'],
  },
  {
    id: 'priors',
    label: 'Development priors',
    ids: ['climate', 'intervention_effects'],
  },
  {
    id: 'placeholders',
    label: 'Placeholders',
    ids: ['cost'],
  },
]);

export const LAYER_LABELS = Object.freeze({
  hazard: 'Hazard',
  cells: 'Cells',
  roads: 'Roads',
});

export function stabilityBand(frequency) {
  const value = Number(frequency) || 0;
  if (value >= STABILITY_BANDS.high.min) return 'high';
  if (value >= STABILITY_BANDS.moderate.min) return 'moderate';
  return 'sensitive';
}

export function frontierTakeaway(frontier) {
  if (!frontier || frontier.length < 3) return null;
  const sorted = [...frontier].sort((a, b) => a.budgetCredits - b.budgetCredits);
  const maxMedian = Math.max(...sorted.map((point) => Number(point.median) || 0));
  if (!(maxMedian > 0)) return null;

  const capture = sorted.find((point) => Number(point.median) >= 0.8 * maxMedian);
  const last = sorted[sorted.length - 1];
  if (!capture || capture.budgetCredits >= last.budgetCredits) return null;

  const leftover = (Number(last.median) - Number(capture.median)) / maxMedian;
  if (leftover > 0.25) return null;

  return `Most additional robust benefit is captured by ${capture.budgetCredits} planning credits in this ensemble.`;
}
