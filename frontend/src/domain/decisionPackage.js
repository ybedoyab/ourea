import { MODEL_PARAMETERS } from '../config/modelConfig.js';
import { planCostCredits } from './optimizer.js';
import { policyConsensus } from './alternatives.js';

function portfolioSummary(option) {
  return {
    profile_id: option.profileId,
    profile_label: option.profile.label,
    policy_weights: {
      equity: option.profile.equityWeight,
      access: option.profile.accessWeight,
      downside_penalty: option.profile.downsidePenalty,
    },
    spent_credits: option.spentCredits,
    projects: option.plan.map((project) => ({
      cell_id: Number(project.cell_id),
      type: project.type,
    })),
    deterministic: {
      benefit_proxy: option.deterministic.benefit,
      equity_benefit_proxy: option.deterministic.equityBenefit,
      access_benefit_proxy: option.deterministic.accessBenefit,
    },
    uncertainty: {
      runs: option.uncertainty.runs,
      p10: option.uncertainty.p10,
      median: option.uncertainty.median,
      p90: option.uncertainty.p90,
      downside_retention: option.downsideRetention,
    },
  };
}

export function buildDecisionPackage({
  scenario,
  budgetCredits,
  view,
  cityLens,
  selectedAiProfileId,
  projects,
  metrics,
  baseline,
  monteCarlo,
  frontier,
  aiDiagnostics,
  alternatives,
  stability,
  pareto,
  summary,
  evidence,
}) {
  const packageProjects = projects.map((project) => ({
    cell_id: Number(project.cell_id),
    type: project.type,
  }));

  return {
    schema: 'ourea-decision-package/v2',
    product: 'OUREA',
    product_expansion: 'Optimized Urban Resilience through Equity & Adaptation',
    slogan: 'From climate risk to robust action.',
    generated_at: new Date().toISOString(),
    model_status: MODEL_PARAMETERS.status,
    scope: {
      city: 'Medellín',
      proving_ground: 'Llanaditas / upper Comuna 8',
      city_screen_lens: cityLens ?? null,
    },
    portfolio_mode: view,
    selected_ai_policy: selectedAiProfileId ?? null,
    scenario: {
      rain_mm: Number(scenario.rainMm),
      antecedent_wetness: Number(scenario.antecedentWetness),
      planning_year: Number(scenario.planningYear),
      status: 'hypothetical-development-scenario-not-SIATA-calibrated',
    },
    budget: {
      unit: 'planning-credit-not-COP',
      available: Number(budgetCredits),
      spent: planCostCredits(packageProjects),
    },
    portfolio: packageProjects,
    sandbox_summary: summary,
    deterministic_metrics: metrics
      ? {
          baseline_exposure_index: metrics.baselineExposure,
          residual_exposure_index: metrics.residualExposure,
          benefit_proxy: metrics.benefit,
          equity_benefit_proxy: metrics.equityBenefit,
          access_benefit_proxy: metrics.accessBenefit,
          buildings_above_stress_threshold:
            metrics.buildingsAboveThreshold,
          population_proxy_above_stress_threshold:
            metrics.populationAboveThreshold,
        }
      : null,
    no_action_metrics: baseline
      ? {
          baseline_exposure_index: baseline.baselineExposure,
          buildings_above_stress_threshold:
            baseline.buildingsAboveThreshold,
          population_proxy_above_stress_threshold:
            baseline.populationAboveThreshold,
        }
      : null,
    uncertainty: monteCarlo
      ? {
          runs: monteCarlo.runs,
          benefit_proxy_p10: monteCarlo.p10,
          benefit_proxy_median: monteCarlo.median,
          benefit_proxy_p90: monteCarlo.p90,
          benefit_proxy_mean: monteCarlo.mean,
          downside_retention:
            monteCarlo.median > 0
              ? monteCarlo.p10 / monteCarlo.median
              : 0,
        }
      : null,
    optimizer_diagnostics: aiDiagnostics,
    robust_policy_alternatives:
      alternatives?.map(portfolioSummary) ?? null,
    policy_consensus:
      alternatives?.length
        ? policyConsensus(alternatives).map((item) => ({
            cell_id: item.cell_id,
            type: item.type,
            selected_by_policies: item.policyCount,
            policy_share: item.policyShare,
            consensus_all_named_policies: item.consensus,
          }))
        : null,
    selection_stability: stability
      ? {
          policy_profile: stability.profileId,
          uncertainty_resamples: stability.runCount,
          scenario_samples_per_optimization:
            stability.scenarioSamplesPerOptimization,
          projects: stability.projects.map((project) => ({
            cell_id: project.cell_id,
            type: project.type,
            selections: project.selections,
            frequency: project.frequency,
          })),
          interpretation: stability.interpretation,
        }
      : null,
    budget_frontier:
      frontier?.map((point) => ({
        policy_profile: point.profileId,
        budget_credits: point.budgetCredits,
        spent_credits: point.spentCredits,
        projects: point.projectCount,
        benefit_proxy_p10: point.p10,
        benefit_proxy_median: point.median,
        benefit_proxy_p90: point.p90,
        downside_retention: point.downsideRetention,
      })) ?? null,
    sampled_multiobjective_tradeoffs: pareto
      ? {
          sampled_profiles: pareto.sampledProfiles,
          unique_portfolios: pareto.uniquePortfolios,
          note: pareto.note,
          non_dominated: pareto.frontier.map((item) => ({
            label: item.label,
            equity_weight: item.equityWeight,
            access_weight: item.accessWeight,
            spent_credits: item.spentCredits,
            robust_median_benefit_proxy: item.robustMedian,
            robust_p10_benefit_proxy: item.robustP10,
            robust_p90_benefit_proxy: item.robustP90,
            equity_benefit_proxy: item.equityBenefit,
            access_benefit_proxy: item.accessBenefit,
            projects: item.plan,
          })),
        }
      : null,
    evidence_status: evidence,
    guardrails: [
      'Climate Stress is not landslide probability.',
      'The city screen is a prioritization proxy, not a dynamic climate forecast or investment recommendation.',
      'The city exposure proxy assumes population is uniformly distributed within each barrio.',
      'Population values in the detailed sandbox are census-based planning proxies.',
      'Planning credits are not COP.',
      'Benefit, equity and access metrics are planning proxies, not people protected/saved or avoided losses.',
      'Policy-objective weights are transparent development settings and require stakeholder co-design.',
      'The sampled non-dominated set is not an exhaustive mathematical Pareto frontier.',
      'Intervention effects and the dynamic climate term remain development priors until calibrated.',
    ],
  };
}

export function downloadDecisionPackage(
  payload,
  filename = 'ourea_decision_package_v4.json',
) {
  const blob = new Blob(
    [`${JSON.stringify(payload, null, 2)}\n`],
    {
      type: 'application/json;charset=utf-8',
    },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
