import assert from 'node:assert/strict';
import test from 'node:test';
import { createDecisionReadinessHandler } from '../lib/handler.js';
import { createMemoryLimiter } from '../lib/rateLimit.js';
import { CONTRACT } from '../lib/schema.js';
import { VALID_SYNTHESIS } from '../../../frontend/tests/fixtures/aiReview.js';

const ORIGIN = 'https://ybedoyab.github.io';

const snapshot = {
  schema_version: 1,
  snapshot_id: 'ourea-testhash',
  language: 'en',
  profile: { id: 'balanced', label: 'Balanced' },
  interventions: [
    { cell_id: 12, type: 'rwh' },
    { cell_id: 18, type: 'drainage' },
  ],
  rainfall: {
    preset_id: 'typical_wet',
    source_name: 'CHIRPS v3.0 Final',
    climatology_period: '1991-2020',
    percentile: 75,
  },
  uncertainty: {
    runs: 40,
    p10: 8.2,
    median: 10,
    p90: 12,
    downside_retention: 0.82,
    label: 'Planning-benefit proxies under modeled wet futures, not people saved.',
  },
  benchmark: {
    robust_p10: 8.2,
    hazard_p10: 6.1,
    deterministic_p10: 7.4,
    robust_holds_lower_tail: true,
  },
  breakage: {
    combinations_below_threshold: 2,
    note: 'Counts are scenario combinations, not spatial grid cells and not a failure forecast.',
  },
  cost: {
    complete: true,
    currency: 'USD',
    low: 328000,
    base: 730000,
    high: 1390000,
    confidence: 'pre-feasibility',
    main_driver: 'Drainage corridor length.',
    label: 'Pre-feasibility implementation envelope, not an offer, contract or engineering estimate.',
  },
  action_footprint: {
    planning_cells_targeted: 2,
    cadastral_buildings: 51,
    high_hazard_buildings: 51,
    population_proxy: 34,
    label: 'Targeted planning proxies, not people protected or avoided losses.',
  },
  evidence: { valid: true, layer_count: 11, statuses: ['official'] },
  community: {
    validation_status: 'not_assessed',
    not_assessed_count: 2,
    documented_count: 0,
    incomplete_count: 0,
    safeguards_activated_count: 0,
    interpretation: 'not_assessed is not support, opposition or low social risk',
  },
  local_alignment: {
    entry_count: 3,
    status: 'documentary-alignment-not-community-support',
    interpretation: 'Documentary alignment, not community endorsement.',
  },
  readiness: {
    status: 'ready_for_field_validation',
    construction_readiness: 'not_assessed_by_ourea',
    next_decision: 'Fund site validation and 30% design, then return with a bill of quantities before construction approval.',
    gates: [
      {
        id: 'community_review',
        status: 'pending',
        label: 'Community review',
        reason: 'Community review is not assessed.',
        evidence_required: 'Record community evidence.',
      },
    ],
  },
  guardrails: ['USD figures in the decision brief are a pre-feasibility implementation envelope, not an offer, contract or engineering estimate.'],
};

function mockReq({ method = 'POST', origin = ORIGIN, body = { snapshot } } = {}) {
  return {
    method,
    headers: origin ? { origin } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    payload: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(data) {
      this.payload = data ? JSON.parse(data) : null;
    },
  };
}

function handlerWith(openai, extras = {}) {
  return createDecisionReadinessHandler({
    openai,
    origins: [ORIGIN, 'http://localhost:5173'],
    rateLimiter: createMemoryLimiter({ maxRequests: 20, windowMs: 60_000 }),
    model: extras.model,
    ...extras,
  });
}

test('valid request uses injected OpenAI client with store:false', async () => {
  let captured = null;
  const openai = {
    responses: {
      parse: async (args) => {
        captured = args;
        return { output_parsed: VALID_SYNTHESIS };
      },
    },
  };
  const res = mockRes();
  await handlerWith(openai, { model: 'gpt-5.6-terra' })(mockReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(captured.store, false);
  assert.equal(captured.model, 'gpt-5.6-terra');
  assert.equal(captured.reasoning.effort, 'low');
  assert.equal('tools' in captured, false);
  assert.deepEqual(res.payload.synthesis.headline, VALID_SYNTHESIS.headline);
  assert.equal(JSON.stringify(res.payload).includes('sk-'), false);
});

test('model is configurable', async () => {
  let captured = null;
  const openai = {
    responses: {
      parse: async (args) => {
        captured = args;
        return { output_parsed: VALID_SYNTHESIS };
      },
    },
  };
  const res = mockRes();
  await handlerWith(openai, { model: 'gpt-test-model' })(mockReq(), res);
  assert.equal(captured.model, 'gpt-test-model');
});

test('missing API key returns unavailable without leaking secrets', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const logs = [];
  const original = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  const res = mockRes();
  await handlerWith(undefined)(mockReq(), res);
  console.error = original;
  if (previous === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previous;
  assert.equal(res.statusCode, 503);
  assert.match(res.payload.error.message, /unavailable/i);
  assert.equal(logs.join(' ').includes('sk-'), false);
  assert.equal(JSON.stringify(res.payload).includes('OPENAI'), false);
});

test('disallowed origin is rejected', async () => {
  const res = mockRes();
  await handlerWith({ responses: { parse: async () => ({}) } })(mockReq({ origin: 'https://evil.example' }), res);
  assert.equal(res.statusCode, 403);
});

test('non-POST methods are rejected', async () => {
  const res = mockRes();
  await handlerWith({ responses: { parse: async () => ({}) } })(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

test('oversized payload is rejected', async () => {
  const res = mockRes();
  await handlerWith({ responses: { parse: async () => ({}) } })(
    mockReq({ body: 'x'.repeat(CONTRACT.snapshot_max_bytes + 2000) }),
    res,
  );
  assert.equal(res.statusCode, 413);
});

test('invalid schema is rejected', async () => {
  const res = mockRes();
  await handlerWith({ responses: { parse: async () => ({}) } })(mockReq({ body: { snapshot: { nope: true } } }), res);
  assert.equal(res.statusCode, 400);
});

test('refusal, timeout, 429 and 500 map to safe errors', async () => {
  const cases = [
    [{ refusal: 'cannot' }, 422],
    [Object.assign(new Error('timed out'), { name: 'AbortError' }), 408],
    [Object.assign(new Error('rate'), { status: 429 }), 429],
    [Object.assign(new Error('boom'), { status: 500 }), 502],
  ];
  for (const [result, status] of cases) {
    const openai = {
      responses: {
        parse: async () => {
          if (result instanceof Error) throw result;
          return result;
        },
      },
    };
    const res = mockRes();
    await handlerWith(openai)(mockReq(), res);
    assert.equal(res.statusCode, status);
    assert.equal(JSON.stringify(res.payload).includes('stack'), false);
    assert.equal(JSON.stringify(res.payload).includes('cannot'), false);
  }
});

test('contract owners match the synthesis enum', () => {
  assert.deepEqual(CONTRACT.owners, [
    'Ourea team',
    'Community representatives',
    'Municipal planning',
    'Engineering team',
  ]);
});
