export const VALID_SYNTHESIS = Object.freeze({
  schema_version: 1,
  headline: 'Walk cells 12 and 18 before any construction decision.',
  portfolio_rationale: [
    'The robust portfolio keeps a stronger lower-tail planning benefit than hazard-only and one-scenario picks under the same budget.',
    'US$ figures are a pre-feasibility envelope; drainage length dominates uncertainty.',
  ],
  gate_explanations: [
    {
      gate_id: 'community_review',
      explanation: 'Community review is not assessed, which is not support or opposition.',
      evidence_needed: 'Record community evidence during the field visit.',
    },
    {
      gate_id: 'drainage_survey',
      explanation: 'Corridor length is still a 40/60/80 m scenario.',
      evidence_needed: 'Survey drainage length before a bill of quantities.',
    },
  ],
  field_visit_questions: [
    'Where does runoff actually concentrate on the walked slope?',
    'Which roofs can host a demonstration tank if residents agree?',
    'What access constraints would change a trench alignment?',
  ],
  next_actions: [
    {
      order: 1,
      action: 'Walk the selected cells with municipal and community counterparts.',
      owner: 'Ourea team',
      timing: 'This month',
    },
    {
      order: 2,
      action: 'Record community evidence before specifying trenches or tanks.',
      owner: 'Community representatives',
      timing: 'During site validation',
    },
    {
      order: 3,
      action: 'Survey drainage length and commission 30% design if the walk confirms the cells.',
      owner: 'Engineering team',
      timing: 'After community review',
    },
  ],
  cost_interpretation: {
    main_driver: 'Drainage scenario length dominates the US$ envelope.',
    uncertainty: 'The low/base/high range is pre-feasibility, not a contract price.',
    survey_requirement: 'A topographic and hydraulic survey converts 40/60/80 m assumptions into quantities.',
  },
  robustness_interpretation: {
    strength: 'Lower-tail planning benefit is compared under a shared budget and seed.',
    caveat: 'Robustness is not a landslide or structural-failure forecast.',
  },
  cannot_conclude: [
    'Ourea cannot say which house will fail or how many people are protected.',
    'Ourea cannot approve construction or declare the hillside safe.',
  ],
});
