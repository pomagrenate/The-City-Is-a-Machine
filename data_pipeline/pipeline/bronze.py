"""pipeline/bronze.py — Bronze Layer: Schema Validation & Raw Ingestion"""

import json
import time
from pathlib import Path

import pandas as pd

REQUIRED_COLUMNS = [
    "tpep_pickup_datetime", "tpep_dropoff_datetime",
    "passenger_count", "trip_distance",
    "PULocationID", "DOLocationID",
    "fare_amount", "tip_amount", "tolls_amount", "total_amount",
    "payment_type", "congestion_surcharge", "airport_fee", "mta_tax", "extra",
]


def run_bronze(data_dir: Path, bronze_dir: Path, year: int, months: list | None) -> dict:
    """Find raw Parquet files, validate schema, write Bronze."""

    # Find raw files
    all_files = sorted(data_dir.rglob("yellow_tripdata_*.parquet"))
    if not all_files:
        # Kaggle sometimes stores without year prefix
        all_files = sorted(data_dir.rglob("*.parquet"))

    if months:
        all_files = [
            f for f in all_files
            if any(f"-{m:02d}" in f.name or f"_{m:02d}" in f.name for m in months)
        ]

    if not all_files:
        raise FileNotFoundError(
            f"No Parquet files found in {data_dir}. "
            "Make sure your Kaggle dataset contains yellow_tripdata_*.parquet files."
        )

    print(f"  Found {len(all_files)} raw file(s)")

    all_stats = []
    total_raw = 0
    total_bronze = 0
    t_total = time.time()

    for raw_path in all_files:
        print(f"  → {raw_path.name} ...", end=" ", flush=True)
        t0 = time.time()

        try:
            df = pd.read_parquet(raw_path)
        except Exception as e:
            print(f"READ ERROR: {e}")
            all_stats.append({"file": raw_path.name, "status": "ERROR", "error": str(e)})
            continue

        rows_raw = len(df)

        # Normalize Green Taxi / FHV column names
        rename_map = {
            "lpep_pickup_datetime": "tpep_pickup_datetime",
            "lpep_dropoff_datetime": "tpep_dropoff_datetime",
            "pickup_datetime": "tpep_pickup_datetime",
            "dropoff_datetime": "tpep_dropoff_datetime",
        }
        df = df.rename(columns=rename_map)

        # Mode tagging
        if "green" in raw_path.name.lower():
            df["mode"] = "green"
        elif "fhvhv" in raw_path.name.lower():
            df["mode"] = "fhvhv"
        else:
            df["mode"] = "yellow"

        # Keep only required columns that exist
        available = [c for c in REQUIRED_COLUMNS + ["mode"] if c in df.columns]
        missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        df = df[available].copy()

        # Drop rows with null in critical columns
        critical = ["tpep_pickup_datetime", "tpep_dropoff_datetime",
                    "PULocationID", "DOLocationID", "total_amount"]
        critical_available = [c for c in critical if c in df.columns]
        df = df.dropna(subset=critical_available)

        # Enforce datetime types
        for col in ["tpep_pickup_datetime", "tpep_dropoff_datetime"]:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")
        df = df.dropna(subset=[c for c in ["tpep_pickup_datetime", "tpep_dropoff_datetime"] if c in df.columns])

        # Enforce int types for location IDs
        for col in ["PULocationID", "DOLocationID"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int32")
        df = df.dropna(subset=[c for c in ["PULocationID", "DOLocationID"] if c in df.columns])

        df["_source_file"] = raw_path.name
        rows_bronze = len(df)
        total_raw += rows_raw
        total_bronze += rows_bronze

        out_path = bronze_dir / raw_path.name
        df.to_parquet(out_path, index=False)

        elapsed = time.time() - t0
        retention = 100 * rows_bronze / rows_raw if rows_raw else 0
        print(f"{rows_raw:,} → {rows_bronze:,} rows ({retention:.1f}%) [{elapsed:.1f}s]")

        all_stats.append({
            "file": raw_path.name, "status": "OK",
            "rows_raw": rows_raw, "rows_bronze": rows_bronze,
            "retention_pct": round(retention, 2),
            "missing_columns": missing,
        })

    return {
        "total_files": len(all_files),
        "files_ok": sum(1 for s in all_stats if s.get("status") == "OK"),
        "total_rows_raw": total_raw,
        "total_rows_bronze": total_bronze,
        "overall_retention_pct": round(100 * total_bronze / total_raw, 2) if total_raw else 0,
        "elapsed_sec": round(time.time() - t_total, 2),
        "files": all_stats,
    }
