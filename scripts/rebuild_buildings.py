"""
Rebuild only the detailed building frontend asset from an original enriched source.

This script is intentionally narrow. The complete v2 artifact is runnable without
raw source files. City screening, terrain tiles, planning cells and other derived
assets require their original municipal/DANE inputs.

Usage:
  python scripts/rebuild_buildings.py /path/to/buildings_population_proxy.geojson
"""
from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import box

BBOX = (-75.541116, 6.250378, -75.536620, 6.254920)
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "public" / "data" / "buildings.geojson"


def rebuild(source_path: Path) -> int:
    buildings = gpd.read_file(source_path)
    sandbox = box(*BBOX)
    buildings = buildings[
        buildings.geometry.representative_point().within(sandbox)
    ].copy()

    required = {
        "objectid",
        "numero_pisos",
        "hazard_max",
        "slope_deg",
        "estrato",
        "population_proxy",
        "cell_id",
    }
    missing = sorted(required.difference(buildings.columns))
    if missing:
        raise ValueError(
            "Source is not the fully enriched v2 building dataset. "
            f"Missing columns: {', '.join(missing)}"
        )

    buildings["height_m"] = (
        pd.to_numeric(buildings["numero_pisos"], errors="coerce")
        .fillna(1)
        .clip(lower=1, upper=20)
        * 3
    )
    buildings.to_file(OUTPUT, driver="GeoJSON")
    return len(buildings)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    args = parser.parse_args()

    if not args.source.exists():
        raise FileNotFoundError(args.source)

    count = rebuild(args.source)
    print(f"Wrote {OUTPUT} with {count:,} buildings.")


if __name__ == "__main__":
    main()
