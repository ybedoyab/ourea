import {
  INTERVENTIONS,
  MODEL_LIMITS,
  MODEL_PARAMETERS,
} from '../config/modelConfig.js';
import { planCostCredits, optimizeRobustPortfolio } from './optimizer.js';
import { evaluatePortfolio, monteCarloPortfolio } from './scenarioEngine.js';

const HAZARD_RANK = Object.freeze({ Alta: 3, Media: 2, Baja: 1 });
const INTERVENTION_ORDER = Object.freeze(['drainage', 'rwh', 'restoration']);

function cellHazardScore(cell) {
  const high = Number(cell.high_hazard_buildings ?? 0);
  if (Number.isFinite(high) && high > 0) return high;
  return HAZARD_RANK[cell.hazard_max] ?? 0;
}

export function selectHazardOnlyPortfolio({
  cellsGeoJson,
  budgetCredits,
  maxProjectsPerCell = MODEL_LIMITS.maxProjectsPerCell,
}) {
  const budget = Math.max(0, Number(budgetCredits));
  const ranked = [...(cellsGeoJson?.features ?? [])]
    .map((feature) => feature.properties)
    .sort(
      (a, b) =>
        cellHazardScore(b) - cellHazardScore(a)
        || Number(a.cell_id) - Number(b.cell_id),
    );

  const plan = [];
  const countByCell = new Map();
  let spent = 0;

  for (const cell of ranked) {
    const cellId = Number(cell.cell_id);
    if (!Number.isFinite(cellId)) continue;
    for (const type of INTERVENTION_ORDER) {
      const config = INTERVENTIONS[type];
      const opportunity = Number(cell[config.suitabilityField] ?? 0);
      if (opportunity < MODEL_PARAMETERS.optimizer.minOpportunity) continue;
      if ((countByCell.get(cellId) ?? 0) >= maxProjectsPerCell) break;
      if (spent + config.costCredits > budget) continue;
      plan.push({ cell_id: cellId, type });
      countByCell.set(cellId, (countByCell.get(cellId) ?? 0) + 1);
      spent += config.costCredits;
      if (spent >= budget) {
        return { plan, spentCredits: spent, selectionMethod: 'hazard-only-greedy' };
      }
    }
  }

  return { plan, spentCredits: spent, selectionMethod: 'hazard-only-greedy' };
}

export function selectDeterministicPortfolio({
  context,
  cellsGeoJson,
  scenario,
  budgetCredits,
  profile = 'balanced',
}) {
  const optimized = optimizeRobustPortfolio({
    context,
    cellsGeoJson,
    scenario,
    budgetCredits,
    profile,
    scenarioSamples: 1,
    freezeScenario: true,
  });
  return {
    plan: optimized.plan,
    spentCredits: optimized.spentCredits,
    selectionMethod: 'deterministic-central-scenario',
    diagnostics: optimized.diagnostics,
  };
}

function overlapShare(plan, reference) {
  if (!reference.length) return 0;
  const keys = new Set(plan.map((project) => `${project.cell_id}:${project.type}`));
  const hits = reference.filter((project) => keys.has(`${project.cell_id}:${project.type}`));
  return hits.length / reference.length;
}

function summarizeStrategy(label, selection, context, scenario, budgetCredits, robustPlan) {
  const spent = selection.spentCredits ?? planCostCredits(selection.plan);
  const deterministic = evaluatePortfolio({
    context,
    projects: selection.plan,
    scenario,
  });
  const uncertainty = monteCarloPortfolio({
    context,
    projects: selection.plan,
    scenario,
    seed: MODEL_PARAMETERS.scenarioUncertainty.comparisonSeed,
  });
  return {
    id: label,
    selectionMethod: selection.selectionMethod,
    spentCredits: spent,
    budgetFeasible: spent <= Number(budgetCredits),
    projectCount: selection.plan.length,
    plan: selection.plan,
    median: uncertainty.median,
    p10: uncertainty.p10,
    p90: uncertainty.p90,
    downsideRetention: uncertainty.median > 0 ? uncertainty.p10 / uncertainty.median : 0,
    equityBenefit: deterministic.equityBenefit,
    accessBenefit: deterministic.accessBenefit,
    overlapWithRobust: overlapShare(selection.plan, robustPlan),
    p10RegretVersusRobust: null,
  };
}

export function compareSelectionStrategies({
  context,
  cellsGeoJson,
  scenario,
  budgetCredits,
  profile = 'balanced',
}) {
  const robust = optimizeRobustPortfolio({
    context,
    cellsGeoJson,
    scenario,
    budgetCredits,
    profile,
  });
  const hazard = selectHazardOnlyPortfolio({ cellsGeoJson, budgetCredits });
  const deterministic = selectDeterministicPortfolio({
    context,
    cellsGeoJson,
    scenario,
    budgetCredits,
    profile,
  });

  const strategies = [
    summarizeStrategy('hazard_only', hazard, context, scenario, budgetCredits, robust.plan),
    summarizeStrategy(
      'deterministic_central',
      deterministic,
      context,
      scenario,
      budgetCredits,
      robust.plan,
    ),
    summarizeStrategy(
      'ourea_robust',
      {
        plan: robust.plan,
        spentCredits: robust.spentCredits,
        selectionMethod: robust.diagnostics.selectionMethod,
      },
      context,
      scenario,
      budgetCredits,
      robust.plan,
    ),
  ];

  const robustP10 = strategies[2].p10;
  for (const item of strategies) {
    item.p10RegretVersusRobust = Number((robustP10 - item.p10).toFixed(4));
  }

  return {
    budgetCredits: Number(budgetCredits),
    profile,
    seed: MODEL_PARAMETERS.scenarioUncertainty.comparisonSeed,
    note: 'Hazard-only ranks mapped high-hazard exposure. Deterministic uses one central-scenario sample. Ourea robust uses the published uncertainty ensemble. None of these is a landslide prediction.',
    strategies,
  };
}
