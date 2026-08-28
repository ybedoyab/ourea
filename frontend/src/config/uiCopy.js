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
    evidence: 'Local household-system precedent; effect remains an explicit planning prior.',
  },
  drainage: {
    mechanism: 'Move concentrated water away from exposed hillside cells.',
    evidence: 'Official drainage-corridor spatial proxy; effect remains an explicit planning prior.',
  },
  restoration: {
    mechanism: 'Stabilize slopes with vegetation and bioengineering.',
    evidence: 'Spatial opportunity proxy; effect remains an explicit planning prior and matures over 3 years.',
  },
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
    ids: ['terrain', 'hazard', 'buildings', 'city_population_2026', 'city_imcv_2023', 'climate'],
  },
  {
    id: 'proxies',
    label: 'Planning proxies',
    ids: ['population', 'access', 'socioeconomic', 'city_priority_screen'],
  },
  {
    id: 'priors',
    label: 'Explicit model assumptions',
    ids: ['intervention_effects'],
  },
  {
    id: 'budget',
    label: 'Budget unit',
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

export const PRIORITY_CARDS = Object.freeze({
  balanced: {
    name: 'Balanced',
    description: 'Balance risk reduction, equity and access.',
    how: 'Keeps exposure reduction first, then adds modest equity and access weights.',
  },
  equity: {
    name: 'Equity-first',
    description: 'Prioritize places with greater vulnerable exposure.',
    how: 'Increases decision weight on cells with high stratum-1 exposure.',
  },
  access: {
    name: 'Access-first',
    description: 'Prioritize interventions related to hillside access.',
    how: 'Increases decision weight on cells that support mapped hillside access.',
  },
  low_regret: {
    name: 'Low-regret',
    description: 'Prioritize projects that remain useful under adverse assumptions.',
    how: 'Penalizes lower-tail uncertainty so fewer, more defensible projects remain.',
  },
});

export const FLOW_STEPS = Object.freeze([
  {
    id: 'area',
    short: 'Area',
    title: 'Where should the city act?',
    instruction: 'The detailed proving ground is Llanaditas. Other barrios inform city ranking only.',
  },
  {
    id: 'conditions',
    short: 'Conditions',
    title: 'What conditions should we plan for?',
    instruction: 'Choose an observed rainfall context and a planning-credit budget.',
  },
  {
    id: 'priorities',
    short: 'Priorities',
    title: 'What should the portfolio prioritize?',
    instruction: 'Pick the public-policy lens Ourea should use under the same data and budget.',
  },
  {
    id: 'portfolio',
    short: 'Portfolio',
    title: 'How do you want to build the portfolio?',
    instruction: 'Let Ourea recommend a portfolio, or place interventions yourself.',
  },
  {
    id: 'review',
    short: 'Review',
    title: 'Does this portfolio hold up?',
    instruction: 'Read the lower tail first, then compare alternatives on the map.',
  },
  {
    id: 'safeguards',
    short: 'Safeguards',
    title: 'Is this decision ready to discuss?',
    instruction: 'Check evidence, community status and local alignment, then download a briefing.',
  },
]);

export const DECISION_ENGINE_COPY = Object.freeze({
  title: 'Decision engine',
  eligibleCandidates: 125,
  uncertaintyScenarios: 80,
  policyObjectives: 4,
  comparisonFutures: 220,
  explanation:
    'Ourea searches intervention-location combinations under budget constraints, reevaluates marginal benefit as projects overlap, penalizes downside and exposes alternative policy choices.',
  milpNote:
    'The browser search is independently cross-checked with a binary MILP. It is not claimed to find a global optimum.',
});
