@echo off
setlocal
cd /d "%~dp0"

cd frontend
echo == Node model/service/domain tests ==
node --test tests/*.test.js
if errorlevel 1 exit /b 1

echo == Frontend V4 data validation ==
node tests\dataValidation.mjs
if errorlevel 1 exit /b 1

echo == Frontend source/DRY validation ==
node tests\sourceValidation.mjs
if errorlevel 1 exit /b 1

if exist "node_modules\.bin\vite.cmd" (
  echo == Vite production build ==
  call npm run build
  if errorlevel 1 exit /b 1
) else (
  echo == Vite production build SKIPPED ==
  echo Install dependencies with npm install, then rerun QA.
)

cd ..
echo == Python syntax ==
python -m compileall -q scripts
if errorlevel 1 exit /b 1

echo == SIATA ingestion + event diagnostic regression tests ==
cd scripts
python -m unittest -v test_siata_ingest.py test_siata_event_diagnostics.py
if errorlevel 1 exit /b 1
cd ..

echo == Browser V4 checkpoints ==
node frontend\scripts\generateCheckpoint.mjs >NUL
if errorlevel 1 exit /b 1

echo == Formal MILP + policy cross-checks ==
python scripts\optimizer_milp.py >NUL
if errorlevel 1 exit /b 1

echo == Full V4 geospatial/model/checkpoint validation ==
python scripts\validate_project.py
if errorlevel 1 exit /b 1

echo == Reproducibility manifest ==
python scripts\make_manifest.py
if errorlevel 1 exit /b 1

echo Competition V4 QA completed.
endlocal
