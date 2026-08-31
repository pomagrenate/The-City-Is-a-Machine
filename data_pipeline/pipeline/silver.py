"""pipeline/silver.py — Silver Layer: Cleaning, Enrichment & Derived Fields"""

import time
from pathlib import Path

import numpy as np
import pandas as pd

PEAK_HOURS   = list(range(7, 10)) + list(range(17, 20))
WEEKEND_DAYS = [5, 6]
AIRPORT_ZONES = {132, 138, 1}

RULES = {
    "fare_amount":    (2.50, 1000.0),
    "total_amount":   (2.50, 2000.0),
    "trip_distance":  (0.1,  200.0),
    "duration_min":   (0.5,  300.0),
    "location_id":    (1,    263),
}


def _enrich_zones(df: pd.DataFrame, zones: pd.DataFrame) -> pd.DataFrame:
    pu = zones.set_index("LocationID")[["Borough", "Zone"]].rename(
        columns={"Borough": "PUBorough", "Zone": "PUZone"})
    do = zones.set_index("LocationID")[["Borough", "Zone"]].rename(
        columns={"Borough": "DOBorough", "Zone": "DOZone"})
    return df.join(pu, on="PULocationID", how="left").join(do, on="DOLocationID", how="left")


def _derived(df: pd.DataFrame) -> pd.DataFrame:
    df["trip_duration_min"] = (
        (df["tpep_dropoff_datetime"] - df["tpep_pickup_datetime"]).dt.total_seconds() / 60
    )
    df["pickup_hour"]       = df["tpep_pickup_datetime"].dt.hour
    df["pickup_dayofweek"]  = df["tpep_pickup_datetime"].dt.dayofweek
    df["pickup_day_name"]   = df["tpep_pickup_datetime"].dt.day_name()
    df["pickup_month"]      = df["tpep_pickup_datetime"].dt.month

    df["is_peak"]    = (df["pickup_hour"].isin(PEAK_HOURS) & ~df["pickup_dayofweek"].isin(WEEKEND_DAYS)).astype(int)
    df["is_weekend"] = df["pickup_dayofweek"].isin(WEEKEND_DAYS).astype(int)

    df["trip_distance_km"] = df["trip_distance"] * 1.60934
    df["revenue_per_km"]   = np.where(df["trip_distance_km"] > 0, df["total_amount"] / df["trip_distance_km"], np.nan)
    df["revenue_per_min"]  = np.where(df["trip_duration_min"] > 0, df["total_amount"] / df["trip_duration_min"], np.nan)
    df["tip_rate"]         = np.where(df["fare_amount"] > 0, df["tip_amount"] / df["fare_amount"], np.nan)

    df["trip_category"] = pd.cut(
        df["trip_distance"], bins=[0, 2, 10, float("inf")],
        labels=["short", "medium", "long"], right=True
    )
    df["is_airport_pickup"]  = df["PULocationID"].isin(AIRPORT_ZONES).astype(int)
    df["is_airport_dropoff"] = df["DOLocationID"].isin(AIRPORT_ZONES).astype(int)
    df["is_airport_trip"]    = ((df["is_airport_pickup"] == 1) | (df["is_airport_dropoff"] == 1)).astype(int)
    return df


def run_silver(bronze_dir: Path, silver_dir: Path, zone_lookup_path: Path, year: int) -> dict:
    zones = pd.read_csv(zone_lookup_path)
    zones.columns = [c.strip() for c in zones.columns]
    print(f"  Zones loaded: {len(zones)}")

    bronze_files = sorted(bronze_dir.glob("*.parquet"))
    if not bronze_files:
        raise FileNotFoundError(f"No bronze files in {bronze_dir}")

    total_in = total_out = 0
    all_stats = []
    t_total = time.time()

    for bf in bronze_files:
        print(f"  → {bf.name} ...", end=" ", flush=True)
        t0 = time.time()
        df = pd.read_parquet(bf)
        rows_in = len(df)

        # Compute duration first (needed for filter)
        df["tpep_pickup_datetime"]  = pd.to_datetime(df["tpep_pickup_datetime"],  errors="coerce")
        df["tpep_dropoff_datetime"] = pd.to_datetime(df["tpep_dropoff_datetime"], errors="coerce")
        df["trip_duration_min"] = (
            (df["tpep_dropoff_datetime"] - df["tpep_pickup_datetime"]).dt.total_seconds() / 60
        )

        # Year filter (allow multi-year dataset processing: 2018-2024)
        df = df[df["tpep_pickup_datetime"].dt.year.between(2018, 2024)]

        # Apply rules
        lo_f, hi_f = RULES["fare_amount"]
        lo_t, hi_t = RULES["total_amount"]
        lo_d, hi_d = RULES["trip_distance"]
        lo_u, hi_u = RULES["duration_min"]
        lo_l, hi_l = RULES["location_id"]

        df = df[df["fare_amount"].between(lo_f, hi_f)]
        df = df[df["total_amount"].between(lo_t, hi_t)]
        df = df[df["trip_distance"].between(lo_d, hi_d)]
        df = df[df["trip_duration_min"].between(lo_u, hi_u)]
        df = df[df["PULocationID"].between(lo_l, hi_l) & df["DOLocationID"].between(lo_l, hi_l)]

        df = _derived(df)
        df = _enrich_zones(df, zones)

        rows_out = len(df)
        total_in  += rows_in
        total_out += rows_out
        sf = silver_dir / bf.name
        df.to_parquet(sf, index=False)
        elapsed = time.time() - t0
        retention = 100 * rows_out / rows_in if rows_in else 0
        print(f"{rows_in:,} → {rows_out:,} ({retention:.1f}%) [{elapsed:.1f}s]")
        all_stats.append({"file": bf.name, "rows_in": rows_in, "rows_out": rows_out})

    return {
        "total_files": len(bronze_files),
        "total_rows_in": total_in,
        "total_rows_out": total_out,
        "overall_retention_pct": round(100 * total_out / total_in, 2) if total_in else 0,
        "elapsed_sec": round(time.time() - t_total, 2),
        "files": all_stats,
    }
