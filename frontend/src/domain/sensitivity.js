import { MODEL_PARAMETERS } from '../config/modelConfig.js';
import { evaluatePortfolio } from './scenarioEngine.js';
import { optimizeRobustPortfolio } from './optimizer.js';

const RAIN_STEPS = Object.freeze([60, 95, 140]);
const WET_STEPS = Object.freeze([0.25, 0.45, 0.75]);
const YEAR_STEPS = Object.freeze([1, 3, 5]);

function planKey(plan) {
  return [...plan]
    .map((project) => `${project.cell_id}:${project.type}`)
    .sort()
    .join('|');
}

export function diagnosePortfolioBreaks({
  context,
  cellsGeoJson,
  plan,
  alternativePlan = [],
  scenario,
  budgetCredits,
  profile = 'balanced',
  thresholdRatio = 0.8,
}) {
  const baseline = evaluatePortfolio({ context, projects: plan, scenario });
  const threshold = baseline.benefit * thresholdRatio;
  const breaches = [];
  const influence = [];

  for (const rainMm of RAIN_STEPS) {
    for (const antecedentWetness of WET_STEPS) {
      for (const planningYear of YEAR_STEPS) {
        const draw = { rainMm, antecedentWetness, planningYear };
        const metrics = evaluatePortfolio({ context, projects: plan, scenario: draw });
        if (metrics.benefit + 1e-9 < threshold) {
          breaches.push({
            rainMm,
            antecedentWetness,
            planningYear,
            benefit: Number(metrics.benefit.toFixed(4)),
          });
        }
      }
    }
  }

  const wetter = evaluatePortfolio({
    context,
    projects: plan,
    scenario: { ...scenario, rainMm: 140, antecedentWetness: 0.75 },
  });
  const drier = evaluatePortfolio({
    context,
    projects: plan,
    scenario: { ...scenario, rainMm: 60, antecedentWetness: 0.25 },
  });
  const mature = evaluatePortfolio({
    context,
    projects: plan,
    scenario: { ...scenario, planningYear: 5 },
  });
  influence.push({
    assumption: 'rainfall_and_wetness',
    deltaBenefit: Number((wetter.benefit - drier.benefit).toFixed(4)),
  });
  influence.push({
    assumption: 'restoration_maturity_year',
    deltaBenefit: Number((mature.benefit - baseline.benefit).toFixed(4)),
  });

  const currentKey = planKey(plan);
  const recommendationChanges = [];
  if (cellsGeoJson) {
    for (const rainMm of RAIN_STEPS) {
      const next = optimizeRobustPortfolio({
        context,
        cellsGeoJson,
        scenario: { ...scenario, rainMm },
        budgetCredits,
        profile,
        scenarioSamples: 20,
      });
      if (planKey(next.plan) !== currentKey) {
        recommendationChanges.push({
          changedBy: 'rainMm',
          value: rainMm,
        });
      }
    }
  }

  const alternative = alternativePlan.length
    ? evaluatePortfolio({ context, projects: alternativePlan, scenario })
    : null;

  return {
    referenceBenefit: Number(baseline.benefit.toFixed(4)),
    breachThreshold: Number(threshold.toFixed(4)),
    thresholdRatio,
    breaches,
    influentialAssumptions: influence.sort(
      (a, b) => Math.abs(b.deltaBenefit) - Math.abs(a.deltaBenefit),
    ),
    recommendationChanges,
    versusAlternative: alternative
      ? {
          benefitDelta: Number((baseline.benefit - alternative.benefit).toFixed(4)),
          equityDelta: Number((baseline.equityBenefit - alternative.equityBenefit).toFixed(4)),
        }
      : null,
    note: 'Deterministic sensitivity on published development controls. Not a calibrated climate forecast and not ML-based scenario discovery.',
  };
}
