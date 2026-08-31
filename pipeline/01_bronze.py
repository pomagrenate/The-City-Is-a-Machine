"""
01_bronze.py — Bronze Layer: Schema Validation & Raw Ingestion

Reads raw Parquet files from data/raw/, validates schema,
drops completely corrupt rows, and writes to data/bronze/.

No business logic. No transformations. Just "is this data usable?"

Usage:
    python pipeline/01_bronze.py
"""

import json
import sys
import time
from pathlib import Path

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
RAW_DIR = ROOT / "data" / "raw"
BRONZE_DIR = ROOT / "data" / "bronze"
BRONZE_DIR.mkdir(parents=True, exist_ok=True)

REPORT_PATH = BRONZE_DIR / "_bronze_report.json"

# ── Expected Schema ───────────────────────────────────────────────────────────

REQUIRED_COLUMNS = [
    "tpep_pickup_datetime",
    "tpep_dropoff_datetime",
    "passenger_count",
    "trip_distance",
    "PULocationID",
    "DOLocationID",
    "fare_amount",
    "tip_amount",
    "tolls_amount",
    "total_amount",
    "payment_type",
]

# ── Processing ────────────────────────────────────────────────────────────────

def validate_and_ingest(raw_path: Path) -> dict:
    """
    Validate a single Parquet file and write a clean Bronze copy.
    Returns a dict with ingestion statistics.
    """
    filename = raw_path.name
    bronze_path = BRONZE_DIR / filename

    print(f"\n  Processing: {filename}")
    t0 = time.time()

    try:
        df = pd.read_parquet(raw_path)
    except Exception as e:
        return {"file": filename, "status": "READ_ERROR", "error": str(e)}

    rows_raw = len(df)
    print(f"    Raw rows: {rows_raw:,}")

    # ── Step 1: Check required columns ───────────────────────────────────────
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        print(f"    ✗ Missing columns: {missing_cols}")
        return {
            "file": filename,
            "status": "SCHEMA_ERROR",
            "missing_columns": missing_cols,
        }

    # Keep only required columns (some files have extra vendor cols)
    df = df[REQUIRED_COLUMNS].copy()

    # ── Step 2: Drop completely null rows ────────────────────────────────────
    before = len(df)
    df = df.dropna(how="all")
    dropped_all_null = before - len(df)

    # ── Step 3: Drop rows with null in critical columns ───────────────────────
    critical = ["tpep_pickup_datetime", "tpep_dropoff_datetime",
                "PULocationID", "DOLocationID", "total_amount"]
    before = len(df)
    df = df.dropna(subset=critical)
    dropped_critical_null = before - len(df)

    # ── Step 4: Enforce types ─────────────────────────────────────────────────
    df["tpep_pickup_datetime"] = pd.to_datetime(df["tpep_pickup_datetime"], errors="coerce")
    df["tpep_dropoff_datetime"] = pd.to_datetime(df["tpep_dropoff_datetime"], errors="coerce")
    df["PULocationID"] = pd.to_numeric(df["PULocationID"], errors="coerce").astype("Int32")
    df["DOLocationID"] = pd.to_numeric(df["DOLocationID"], errors="coerce").astype("Int32")

    before = len(df)
    df = df.dropna(subset=["tpep_pickup_datetime", "tpep_dropoff_datetime",
                            "PULocationID", "DOLocationID"])
    dropped_type_errors = before - len(df)

    # ── Step 5: Add provenance metadata ──────────────────────────────────────
    df["_source_file"] = filename

    rows_bronze = len(df)
    elapsed = time.time() - t0

    # ── Write Bronze ──────────────────────────────────────────────────────────
    df.to_parquet(bronze_path, index=False, engine="pyarrow")

    retention_pct = 100 * rows_bronze / rows_raw if rows_raw > 0 else 0
    size_mb = bronze_path.stat().st_size / (1024 ** 2)

    stats = {
        "file": filename,
        "status": "OK",
        "rows_raw": rows_raw,
        "rows_bronze": rows_bronze,
        "retention_pct": round(retention_pct, 2),
        "dropped_all_null": dropped_all_null,
        "dropped_critical_null": dropped_critical_null,
        "dropped_type_errors": dropped_type_errors,
        "bronze_size_mb": round(size_mb, 2),
        "elapsed_sec": round(elapsed, 2),
    }

    print(f"    ✓ Rows retained: {rows_bronze:,} / {rows_raw:,} ({retention_pct:.1f}%)")
    print(f"    ✓ Bronze size: {size_mb:.1f} MB | Elapsed: {elapsed:.1f}s")

    return stats


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  THE CITY IS A MACHINE — Bronze Pipeline")
    print("=" * 60)
    print(f"  Input:  {RAW_DIR}")
    print(f"  Output: {BRONZE_DIR}")

    raw_files = sorted(RAW_DIR.glob("yellow_tripdata_*.parquet"))

    if not raw_files:
        print("\n  ✗ No raw Parquet files found!")
        print("    Run: python data/download.py")
        sys.exit(1)

    print(f"\n  Found {len(raw_files)} file(s) to process:")
    for f in raw_files:
        print(f"    • {f.name}")

    all_stats = []
    t_total = time.time()

    for raw_file in raw_files:
        stats = validate_and_ingest(raw_file)
        all_stats.append(stats)

    # ── Final report ──────────────────────────────────────────────────────────
    elapsed_total = time.time() - t_total
    ok_files = [s for s in all_stats if s.get("status") == "OK"]
    total_raw = sum(s.get("rows_raw", 0) for s in ok_files)
    total_bronze = sum(s.get("rows_bronze", 0) for s in ok_files)

    report = {
        "total_files_processed": len(all_stats),
        "files_ok": len(ok_files),
        "files_failed": len(all_stats) - len(ok_files),
        "total_rows_raw": total_raw,
        "total_rows_bronze": total_bronze,
        "overall_retention_pct": round(100 * total_bronze / total_raw, 2) if total_raw > 0 else 0,
        "elapsed_sec": round(elapsed_total, 2),
        "files": all_stats,
    }

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print()
    print("=" * 60)
    print("  BRONZE PIPELINE COMPLETE")
    print("=" * 60)
    print(f"  Files processed: {report['total_files_processed']}")
    print(f"  OK / Failed: {report['files_ok']} / {report['files_failed']}")
    print(f"  Total rows (raw):    {total_raw:>15,}")
    print(f"  Total rows (bronze): {total_bronze:>15,}")
    print(f"  Overall retention:   {report['overall_retention_pct']}%")
    print(f"  Elapsed: {elapsed_total:.1f}s")
    print(f"\n  Report saved: {REPORT_PATH}")
    print()
    print("  Next step:")
    print("    python pipeline/02_silver.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
