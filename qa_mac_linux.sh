#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/frontend"
echo "== Node model/service/domain tests =="
node --test tests/*.test.js

echo "== Frontend V4 data validation =="
node tests/dataValidation.mjs

echo "== Frontend source/DRY validation =="
node tests/sourceValidation.mjs

if [ -x "node_modules/.bin/vite" ]; then
  echo "== Vite production build =="
  npm run build
else
  echo "== Vite production build SKIPPED =="
  echo "Install dependencies with npm install on an internet-enabled machine."
fi

cd "$ROOT"
echo "== Python syntax =="
python -m compileall -q scripts

echo "== SIATA ingestion + event diagnostic regression tests =="
cd "$ROOT/scripts"
python -m unittest -v test_siata_ingest.py test_siata_event_diagnostics.py
cd "$ROOT"

echo "== Browser V4 checkpoints =="
node frontend/scripts/generateCheckpoint.mjs >/dev/null

echo "== Formal MILP + policy cross-checks =="
python scripts/optimizer_milp.py >/dev/null

echo "== Full V4 geospatial/model/checkpoint validation =="
python scripts/validate_project.py

echo "== Reproducibility manifest =="
python scripts/make_manifest.py

echo "Competition V4 QA completed."
