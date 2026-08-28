import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildDecisionBrief } from '../src/domain/decisionBrief.js';
import { buildDecisionBriefPdf } from '../src/domain/decisionBriefPdf.js';
import { GUIDED_CELLS, guidedPayload } from '../tests/fixtures/guidedPlan.js';

const frontend = dirname(fileURLToPath(new URL('../', import.meta.url)));
const outDir = process.argv[2] || join(frontend, '..', '.cache', 'pdf-audit');
const costContext = JSON.parse(
  await readFile(new URL('../public/data/cost_context.json', import.meta.url), 'utf8'),
);

async function save(name, payload) {
  const brief = buildDecisionBrief(payload, { cells: GUIDED_CELLS, costContext });
  const bytes = new Uint8Array(await buildDecisionBriefPdf(brief).arrayBuffer());
  await writeFile(join(outDir, name), bytes);
  console.log(name, bytes.length);
}

await mkdir(outDir, { recursive: true });
await save('guided-rwh-drainage.pdf', guidedPayload());
await save(
  'restoration.pdf',
  guidedPayload({
    portfolio: [{ cell_id: 7, type: 'restoration' }],
    budget: { spent: 2, available: 10 },
  }),
);
