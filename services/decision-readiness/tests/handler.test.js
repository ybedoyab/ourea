import assert from 'node:assert/strict';
import test from 'node:test';
import { createDecisionReadinessHandler } from '../lib/handler.js';
import { createMemoryLimiter } from '../lib/rateLimit.js';
import { CONTRACT } from '../lib/schema.js';
import { VALID_SNAPSHOT, VALID_SYNTHESIS } from '../../../frontend/tests/fixtures/aiReview.js';

const ORIGIN = 'https://ybedoyab.github.io';
const snapshot = VALID_SNAPSHOT;

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
