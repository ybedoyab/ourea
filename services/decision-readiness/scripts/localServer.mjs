import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDecisionReadinessHandler } from '../lib/handler.js';

function loadLocalEnv() {
  const path = fileURLToPath(new URL('../.env.local', import.meta.url));
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const handler = createDecisionReadinessHandler();
const server = http.createServer((req, res) => {
  if (req.url === '/api/decision-readiness' || req.url === '/api/decision-readiness/') {
    handler(req, res);
    return;
  }
  res.statusCode = 404;
  res.end('Not found');
});

server.listen(8787, '127.0.0.1', () => {
  process.stdout.write('decision-readiness listening on http://127.0.0.1:8787/api/decision-readiness\n');
});
