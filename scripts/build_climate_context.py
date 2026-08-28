"""Build frontend/public/data/climate_context.json from CHIRPS v3 Final.

Extracts one 0.05° cell at the Llanaditas / upper Comuna 8 centroid from the
Latin America pentad GeoTIFF subset (native CHIRPS Final timestep). Rasters
are window-sampled and never committed.

Runtime Ourea never calls this script or CHIRPS. The shipped JSON is the
offline climate context.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
import time
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, wait
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from chirps_stats import (
    AVAILABLE_END,
    AVAILABLE_START,
    CLIMATOLOGY_END,
    CLIMATOLOGY_START,
    LLANADITAS_BBOX,
    LLANADITAS_LAT,
    LLANADITAS_LON,
    build_scenario_presets,
    expand_pentads_to_daily,
    filter_period,
    is_valid_precip,
    iter_year_month_pentads,
    summarize_series,
)

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "chirps"
OUTPUT = ROOT / "frontend" / "public" / "data" / "climate_context.json"
PENTAD_CSV = CACHE / "llanaditas_pentad_latam.csv"

CHIRPS_VERSION = "v3.0"
CHIRPS_PRODUCT = "pentads/latam (Final)"
CHIRPS_PENTAD_ROOT = "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/pentads/latam/tifs"
SOURCE_URLS = [
    "https://www.chc.ucsb.edu/data/chirps",
    "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/",
    "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/README-CHIRPSv3.0.txt",
    "https://www.nature.com/articles/s41597-026-07096-4",
    f"{CHIRPS_PENTAD_ROOT}/",
]
DOI = "https://doi.org/10.1038/s41597-026-07096-4"
NODATA = -9999.0
EXPECTED_WIDTH = 1720
EXPECTED_HEIGHT = 1900
MIN_BYTES = 1_500_000
MAX_BYTES = 8_000_000
SPATIAL_RESOLUTION = "0.05 degrees (~5.5 km at the equator)"
TEMPORAL_RESOLUTION = "Native pentads (Final); daily series allocated uniformly within each pentad"

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.tiff,.cog")
os.environ.setdefault("GDAL_HTTP_MERGE_CONSECUTIVE_RANGES", "YES")
os.environ.setdefault("CPL_VSIL_CURL_USE_HEAD", "NO")
os.environ.setdefault("GDAL_HTTP_TIMEOUT", "20")
os.environ.setdefault("GDAL_HTTP_CONNECTTIMEOUT", "10")
os.environ.setdefault("VSI_CACHE", "TRUE")
os.environ.setdefault("GDAL_PAM_ENABLED", "NO")


def pentad_url(year: int, month: int, pentad: int) -> str:
    return (
        f"{CHIRPS_PENTAD_ROOT}/"
        f"chirps-v3.0.{year}.{month:02d}.{pentad}.tif"
    )


def pentad_key(year: int, month: int, pentad: int) -> str:
    return f"{year}-{month:02d}-{pentad}"


def parse_pentad_key(key: str) -> tuple[int, int, int]:
    year_s, month_s, pentad_s = key.split("-")
    return int(year_s), int(month_s), int(pentad_s)


def load_cached_pentads() -> dict[tuple[int, int, int], float | None]:
    if not PENTAD_CSV.exists():
        return {}
    out: dict[tuple[int, int, int], float | None] = {}
    with PENTAD_CSV.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            key = parse_pentad_key(row["pentad"])
            raw = row.get("precip_mm", "")
            if raw in {"", "None", "nan"}:
                out[key] = None
            else:
                value = float(raw)
                out[key] = value if is_valid_precip(value, NODATA) else None
    return out


def write_cached_pentads(series: dict[tuple[int, int, int], float | None]) -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    with PENTAD_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["pentad", "precip_mm"])
        writer.writeheader()
        for year, month, pentad in sorted(series):
            value = series[(year, month, pentad)]
            writer.writerow(
                {
                    "pentad": pentad_key(year, month, pentad),
                    "precip_mm": "" if value is None else f"{value:.6f}",
                }
            )


def sample_pentad_pixel(url: str, lon: float, lat: float) -> tuple[float | None, dict[str, object]]:
    import rasterio
    from rasterio.env import Env

    provenance: dict[str, object] = {"url": url}
    with Env():
        with rasterio.open(f"/vsicurl/{url}") as dataset:
            provenance["crs"] = str(dataset.crs)
            provenance["nodata"] = dataset.nodata
            provenance["width"] = int(dataset.width)
            provenance["height"] = int(dataset.height)
            if dataset.width != EXPECTED_WIDTH or dataset.height != EXPECTED_HEIGHT:
                raise RuntimeError(
                    f"Unexpected raster size {dataset.width}x{dataset.height} for {url}"
                )
            row, col = dataset.index(lon, lat)
            provenance["row"] = int(row)
            provenance["col"] = int(col)
            window = rasterio.windows.Window(col, row, 1, 1)
            array = dataset.read(1, window=window)
            if array.size == 0:
                raise RuntimeError(f"Empty window for {url}")
            value = float(array[0, 0])
            nodata = dataset.nodata if dataset.nodata is not None else NODATA
            if not is_valid_precip(value, nodata):
                return None, provenance
            return value, provenance


def sample_with_retry(
    year: int,
    month: int,
    pentad: int,
    attempts: int = 2,
) -> tuple[str, float | None, dict[str, object]]:
    url = pentad_url(year, month, pentad)
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            value, provenance = sample_pentad_pixel(url, LLANADITAS_LON, LLANADITAS_LAT)
            provenance["attempts"] = attempt
            return pentad_key(year, month, pentad), value, provenance
        except Exception as error:  # noqa: BLE001 — record and retry HTTP/GDAL flakes
            last_error = error
            time.sleep(0.8 * attempt)
    print(
        f"  warning: {pentad_key(year, month, pentad)} left as missing after "
        f"{attempts} attempts: {last_error}",
        flush=True,
    )
    return pentad_key(year, month, pentad), None, {"url": url, "error": str(last_error), "attempts": attempts}


def extract_pentads(
    start: date,
    end: date,
    *,
    workers: int,
    resume: bool,
) -> tuple[dict[tuple[int, int, int], float | None], dict[str, object]]:
    cached = load_cached_pentads() if resume else {}
    keys = iter_year_month_pentads(start, end)
    missing = [key for key in keys if key not in cached]
    missing.sort(
        key=lambda item: (
            0 if CLIMATOLOGY_START.year <= item[0] <= CLIMATOLOGY_END.year else 1,
            item[0],
            item[1],
            item[2],
        )
    )
    first_provenance: dict[str, object] | None = None
    if missing:
        print(f"Sampling {len(missing)} CHIRPS v3 Final latam pentad pixels…", flush=True)
        completed = 0
        batch_size = max(1, workers) * 3
        with ProcessPoolExecutor(
            max_workers=max(1, workers),
            max_tasks_per_child=8,
        ) as pool:
            for offset in range(0, len(missing), batch_size):
                batch = missing[offset : offset + batch_size]
                future_map = {}
                for year, month, pentad in batch:
                    future_map[pool.submit(sample_with_retry, year, month, pentad)] = (
                        year,
                        month,
                        pentad,
                    )
                    time.sleep(0.35)
                pending = set(future_map)
                while pending:
                    done, pending = wait(pending, timeout=90, return_when=FIRST_COMPLETED)
                    if not done:
                        print(
                            f"  warning: batch stalled; leaving {len(pending)} pentads uncached for retry",
                            flush=True,
                        )
                        for future in pending:
                            future.cancel()
                        pending.clear()
                        break
                    for future in done:
                        key = future_map[future]
                        try:
                            pentad_id, value, provenance = future.result(timeout=1)
                            cached[parse_pentad_key(pentad_id)] = value
                            if first_provenance is None:
                                first_provenance = provenance
                        except Exception as error:  # noqa: BLE001
                            print(f"  warning: {key} worker failed: {error}", flush=True)
                            continue
                        completed += 1
                        if completed == 1 or completed % 20 == 0 or completed == len(missing):
                            write_cached_pentads(cached)
                            print(f"  {completed}/{len(missing)} pentads", flush=True)
                write_cached_pentads(cached)
        write_cached_pentads(cached)
    elif cached:
        print(f"Using cached pentad series ({len(cached)} pentads).", flush=True)

    series = {key: cached.get(key) for key in keys}
    if first_provenance is None:
        year, month, pentad = keys[0]
        first_provenance = {"url": pentad_url(year, month, pentad), "from_cache": True}
    return series, first_provenance or {}


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes().replace(b"\r\n", b"\n"))
    return digest.hexdigest()


def build_document(
    available_series: list[tuple[date, float | None]],
    sample_provenance: dict[str, object],
    accessed_at: str,
    pentad_valid: int,
    pentad_total: int,
) -> dict[str, object]:
    climatology_series = filter_period(available_series, CLIMATOLOGY_START, CLIMATOLOGY_END)
    climatology = summarize_series(climatology_series)
    available = summarize_series(available_series)
    climatology["period"] = f"{CLIMATOLOGY_START.year}-{CLIMATOLOGY_END.year}"
    presets = build_scenario_presets(climatology)

    pixel_bounds = None
    if sample_provenance.get("row") is not None:
        half = 0.025
        pixel_bounds = [
            round(LLANADITAS_LON - half, 5),
            round(LLANADITAS_LAT - half, 5),
            round(LLANADITAS_LON + half, 5),
            round(LLANADITAS_LAT + half, 5),
        ]

    return {
        "schema": "ourea-climate-context",
        "schema_version": 1,
        "generated_at": iso_now(),
        "source_name": "CHIRPS v3.0 Final",
        "source_version": CHIRPS_VERSION,
        "source_product": CHIRPS_PRODUCT,
        "source_urls": SOURCE_URLS,
        "doi": DOI,
        "accessed_at": accessed_at,
        "spatial_resolution": SPATIAL_RESOLUTION,
        "temporal_resolution": TEMPORAL_RESOLUTION,
        "area": "Llanaditas / upper Comuna 8, Medellín. One CHIRPS 0.05° cell containing the proving-ground centroid.",
        "coordinates": {
            "lon": LLANADITAS_LON,
            "lat": LLANADITAS_LAT,
            "epsg": 4326,
        },
        "bounds": {
            "proving_ground": list(LLANADITAS_BBOX),
            "extracted_cell_approx": pixel_bounds,
        },
        "climatology_period": {
            "start": CLIMATOLOGY_START.isoformat(),
            "end": CLIMATOLOGY_END.isoformat(),
            "label": "1991-2020",
        },
        "available_period": {
            "start": AVAILABLE_START.isoformat(),
            "end": AVAILABLE_END.isoformat(),
            "label": "1981-2024",
        },
        "daily_percentiles": climatology["daily_percentiles"],
        "rolling_accumulation_percentiles": climatology["rolling_accumulation_percentiles"],
        "observed_maxima": {
            "climatology_1991_2020": climatology["observed_maxima"],
            "available_1981_2024": available["observed_maxima"],
        },
        "scenario_presets": presets,
        "available_record_summary": {
            "daily_percentiles": available["daily_percentiles"],
            "daily_valid_days": available["daily_valid_days"],
            "coverage": available["coverage"],
            "valid_pentads": pentad_valid,
            "calendar_pentads": pentad_total,
        },
        "climatology_coverage": climatology["coverage"],
        "method": {
            "product": "CHIRPS v3.0 Final pentads, Latin America GeoTIFF subset.",
            "extract": (
                "Windowed GeoTIFF read of the single 0.05° cell containing "
                "the Llanaditas / upper Comuna 8 centroid. Colombia-wide rasters are not stored."
            ),
            "daily_allocation": (
                "Each pentad total is divided equally across its calendar days "
                "(1–5, 6–10, 11–15, 16–20, 21–25, 26–end of month). "
                "This preserves pentad mass, so 15- and 30-day accumulations match the native product. "
                "Intra-pentad timing is not independently observed."
            ),
            "climatology": "WMO-style 1991–2020 reference period on valid daily-allocated values.",
            "percentiles": "Empirical Hyndman-Fan type 7 (linear) percentiles on valid observations.",
            "rolling": "Trailing inclusive accumulations of 3, 7, 15 and 30 days; incomplete windows excluded.",
            "nodata": "CHIRPS nodata (-9999), NaN and negative values are excluded.",
            "leap_years": "29 February is retained in leap years and counted in coverage.",
            "preset_mapping": (
                "Typical / high / extreme planning presets use 15-day accumulation percentiles "
                "P75 / P90 / P99 and an antecedent rainfall percentile, not soil moisture."
            ),
        },
        "appropriate_uses": [
            "Anchor hypothetical planning rainfall contexts in an observed gridded climatology.",
            "Compare portfolio performance across typical, high and extreme observed rainfall contexts.",
            "Document source, period, window and percentile for every climate figure shown in Ourea.",
        ],
        "limitations": [
            "CHIRPS is a 0.05° gridded estimate, not rain-gauge intensity at a hillside station.",
            "Daily values are pentad totals allocated uniformly inside each pentad; they are not station daily gauges and not the ERA5-ratio rnl partition.",
            "Ourea evaluates portfolio performance across observed and stress-tested rainfall contexts. It supports planning decisions; it does not issue real-time forecasts.",
            "These values are not landslide probability, failure chance, or a calibrated warning threshold.",
        ],
        "input_provenance": {
            "tif_root": CHIRPS_PENTAD_ROOT,
            "filename_pattern": "chirps-v3.0.{YYYY}.{MM}.{pentad}.tif",
            "sample": {
                "url": sample_provenance.get("url"),
                "crs": sample_provenance.get("crs"),
                "row": sample_provenance.get("row"),
                "col": sample_provenance.get("col"),
                "width": sample_provenance.get("width"),
                "height": sample_provenance.get("height"),
                "bytes": sample_provenance.get("bytes"),
                "from_cache": bool(sample_provenance.get("from_cache")),
            },
            "cache_csv": str(PENTAD_CSV.relative_to(ROOT)).replace("\\", "/"),
            "nodata_value": NODATA,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default=AVAILABLE_START.isoformat())
    parser.add_argument("--end", default=AVAILABLE_END.isoformat())
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument("--from-cache-only", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end)
    accessed_at = iso_now()
    keys = iter_year_month_pentads(start, end)

    if args.from_cache_only:
        cached = load_cached_pentads()
        if not cached:
            raise SystemExit("No CHIRPS pentad cache found. Run without --from-cache-only.")
        pentads = {key: cached.get(key) for key in keys}
        year, month, pentad = keys[0]
        sample = {"url": pentad_url(year, month, pentad), "from_cache": True}
    else:
        pentads, sample = extract_pentads(
            start,
            end,
            workers=args.workers,
            resume=not args.no_resume,
        )

    pentad_valid = sum(1 for value in pentads.values() if is_valid_precip(value))
    if pentad_valid < 2000:
        raise SystemExit(
            f"Only {pentad_valid} valid pentads; expected ~{len(keys)}. Refusing to write."
        )

    series = expand_pentads_to_daily(pentads, start, end)
    climatology_valid = sum(
        1
        for day, value in series
        if CLIMATOLOGY_START <= day <= CLIMATOLOGY_END and is_valid_precip(value)
    )
    if climatology_valid < 10_000:
        raise SystemExit(
            f"Climatology has only {climatology_valid} valid days; expected ~10,957. Refusing to write."
        )

    document = build_document(series, sample, accessed_at, pentad_valid, len(keys))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(document, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {args.output} sha256={sha256_file(args.output)}")
    print("Presets:", json.dumps(document["scenario_presets"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
