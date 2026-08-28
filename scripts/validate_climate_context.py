"""Offline validation of the shipped CHIRPS climate_context.json."""
from __future__ import annotations

import json
from pathlib import Path

REQUIRED_TOP = (
    "schema_version",
    "generated_at",
    "source_name",
    "source_version",
    "source_urls",
    "doi",
    "accessed_at",
    "spatial_resolution",
    "temporal_resolution",
    "area",
    "climatology_period",
    "available_period",
    "daily_percentiles",
    "rolling_accumulation_percentiles",
    "observed_maxima",
    "scenario_presets",
    "method",
    "appropriate_uses",
    "limitations",
    "input_provenance",
)

REQUIRED_PRESET = (
    "id",
    "label",
    "accumulation_window_days",
    "precipitation_mm",
    "percentile",
    "climatology_period",
    "source_name",
)

PRESET_IDS = ("typical_wet", "high_rainfall", "extreme_observed")


def load_climate_context(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_climate_context(document: dict) -> list[str]:
    errors = []
    for key in REQUIRED_TOP:
        if key not in document and key != "coordinates":
            if key == "area" and "coordinates" not in document and "bounds" not in document:
                errors.append("missing area/coordinates/bounds")
            elif key not in document:
                errors.append(f"missing {key}")
    if "coordinates" not in document and "bounds" not in document:
        errors.append("missing coordinates or bounds")
    if document.get("source_version") != "v3.0":
        errors.append("source_version must be v3.0")
    if "Final" not in str(document.get("source_name", "")):
        errors.append("source_name must identify CHIRPS Final")
    if document.get("climatology_period", {}).get("label") != "1991-2020":
        errors.append("climatology_period.label must be 1991-2020")
    rolling = document.get("rolling_accumulation_percentiles") or {}
    for window in ("3", "7", "15", "30"):
        if window not in rolling:
            errors.append(f"missing rolling window {window}")
    presets = document.get("scenario_presets") or []
    ids = [item.get("id") for item in presets]
    if tuple(ids) != PRESET_IDS:
        errors.append(f"preset ids {ids} != {PRESET_IDS}")
    for preset in presets:
        for key in REQUIRED_PRESET:
            if key not in preset:
                errors.append(f"preset {preset.get('id')} missing {key}")
        if "soil" in json.dumps(preset).lower() or "wetness" in json.dumps(preset).lower():
            errors.append("preset uses soil-wetness language")
    blob = json.dumps(document).lower()
    for banned in ("predicts landslide", "real-time warning", "digital twin"):
        if banned in blob:
            errors.append(f"banned claim: {banned}")
    if "chirps" not in blob:
        errors.append("document does not mention CHIRPS")
    return errors


def main() -> int:
    path = Path(__file__).resolve().parents[1] / "frontend" / "public" / "data" / "climate_context.json"
    if not path.exists():
        print(f"missing {path}")
        return 1
    errors = validate_climate_context(load_climate_context(path))
    if errors:
        print("\n".join(errors))
        return 1
    print(f"climate_context.json ok ({path})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
