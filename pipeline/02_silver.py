"""
02_silver.py — Silver Layer: Cleaning, Enrichment & Derived Fields

Reads Bronze Parquet files, applies business cleaning rules,
enriches with zone names, computes derived fields.

Usage:
    python pipeline/02_silver.py
"""

import json
import sys
import time
from pathlib import Path

import pandas as pd
import numpy as np

ROOT = Path(__file__).parent.parent
BRONZE_DIR = ROOT / "data" / "bronze"
SILVER_DIR = ROOT / "data" / "silver"
ZONE_LOOKUP_PATH = ROOT / "data" / "taxi_zone_lookup.csv"
SILVER_DIR.mkdir(parents=True, exist_ok=True)
REPORT_PATH = SILVER_DIR / "_silver_report.json"

PEAK_HOURS = list(range(7, 10)) + list(range(17, 20))
WEEKEND_DAYS = [5, 6]
AIRPORT_ZONES = {132: "JFK Airport", 138: "LaGuardia Airport", 1: "Newark Airport"}

RULES = {
    "fare_amount": (2.50, 1000.0),
    "total_amount": (2.50, 2000.0),
    "trip_distance": (0.1, 200.0),
    "duration_min": (0.5, 300.0),
    "location_id": (1, 263),
    "year": 2023,
}


def load_zone_lookup():
    if not ZONE_LOOKUP_PATH.exists():
        print("  ✗ Zone lookup not found. Run: python data/download.py --zone-only")
        sys.exit(1)
    z = pd.read_csv(ZONE_LOOKUP_PATH)
    z.columns = [c.strip() for c in z.columns]
    return z


def process_file(bronze_path: Path, zones: pd.DataFrame) -> dict:
    filename = bronze_path.name
    silver_path = SILVER_DIR / filename
    print(f"\n  Processing: {filename}")
    t0 = time.time()

    df = pd.read_parquet(bronze_path)
    rows_in = len(df)

    # ── Compute duration ───────────────────────────────────────────────────
    df["trip_duration_min"] = (
        (pd.to_datetime(df["tpep_dropoff_datetime"]) - pd.to_datetime(df["tpep_pickup_datetime"]))
        .dt.total_seconds() / 60
    )

    # ── Cleaning rules ─────────────────────────────────────────────────────
    dropped = {}

    before = len(df)
    df = df[df["tpep_pickup_datetime"].dt.year == RULES["year"]]
    dropped["wrong_year"] = before - len(df)

    for field, (lo, hi) in [("fare_amount", RULES["fare_amount"]),
                              ("total_amount", RULES["total_amount"]),
                              ("trip_distance", RULES["trip_distance"]),
                              ("trip_duration_min", RULES["duration_min"])]:
        before = len(df)
        df = df[df[field].between(lo, hi)]
        dropped[f"invalid_{field}"] = before - len(df)

    lo, hi = RULES["location_id"]
    before = len(df)
    df = df[df["PULocationID"].between(lo, hi) & df["DOLocationID"].between(lo, hi)]
    dropped["invalid_location"] = before - len(df)

    # ── Derived fields ─────────────────────────────────────────────────────
    df["pickup_hour"]      = df["tpep_pickup_datetime"].dt.hour
    df["pickup_dayofweek"] = df["tpep_pickup_datetime"].dt.dayofweek
    df["pickup_day_name"]  = df["tpep_pickup_datetime"].dt.day_name()
    df["pickup_month"]     = df["tpep_pickup_datetime"].dt.month
    df["pickup_date"]      = df["tpep_pickup_datetime"].dt.date

    df["is_peak"]    = (df["pickup_hour"].isin(PEAK_HOURS) & ~df["pickup_dayofweek"].isin(WEEKEND_DAYS)).astype(int)
    df["is_weekend"] = df["pickup_dayofweek"].isin(WEEKEND_DAYS).astype(int)

    df["trip_distance_km"] = df["trip_distance"] * 1.60934
    df["revenue_per_km"]   = np.where(df["trip_distance_km"] > 0, df["total_amount"] / df["trip_distance_km"], np.nan)
    df["revenue_per_min"]  = np.where(df["trip_duration_min"] > 0, df["total_amount"] / df["trip_duration_min"], np.nan)
    df["tip_rate"]         = np.where(df["fare_amount"] > 0, df["tip_amount"] / df["fare_amount"], np.nan)

    df["trip_category"] = pd.cut(df["trip_distance"], bins=[0, 2, 10, float("inf")],
                                  labels=["short", "medium", "long"], right=True)

    df["is_airport_pickup"]  = df["PULocationID"].isin(AIRPORT_ZONES).astype(int)
    df["is_airport_dropoff"] = df["DOLocationID"].isin(AIRPORT_ZONES).astype(int)
    df["is_airport_trip"]    = ((df["is_airport_pickup"] == 1) | (df["is_airport_dropoff"] == 1)).astype(int)

    hour_bins   = [0, 6, 10, 15, 19, 22, 24]
    hour_labels = ["Night (0–6)", "Morning Peak (6–10)", "Midday (10–15)",
                   "Evening Peak (15–19)", "Evening (19–22)", "Late Night (22–24)"]
    df["hour_bucket"] = pd.cut(df["pickup_hour"], bins=hour_bins, labels=hour_labels,
                                right=False, include_lowest=True)

    # ── Zone enrichment ────────────────────────────────────────────────────
    pu = zones.set_index("LocationID")[["Borough", "Zone"]].rename(
        columns={"Borough": "PUBorough", "Zone": "PUZone"})
    do = zones.set_index("LocationID")[["Borough", "Zone"]].rename(
        columns={"Borough": "DOBorough", "Zone": "DOZone"})
    df = df.join(pu, on="PULocationID", how="left").join(do, on="DOLocationID", how="left")

    rows_out = len(df)
    df.to_parquet(silver_path, index=False, engine="pyarrow")
    elapsed = time.time() - t0
    size_mb = silver_path.stat().st_size / (1024 ** 2)
    retention = 100 * rows_out / rows_in if rows_in else 0

    print(f"    {rows_in:,} → {rows_out:,} rows ({retention:.1f}%) | {size_mb:.1f} MB | {elapsed:.1f}s")
    return {"file": filename, "status": "OK", "rows_in": rows_in, "rows_out": rows_out,
            "retention_pct": round(retention, 2), "dropped": dropped,
            "silver_size_mb": round(size_mb, 2), "elapsed_sec": round(elapsed, 2)}


def main():
    print("=" * 60)
    print("  THE CITY IS A MACHINE — Silver Pipeline")
    print("=" * 60)
    zones = load_zone_lookup()
    bronze_files = sorted(BRONZE_DIR.glob("yellow_tripdata_*.parquet"))
    if not bronze_files:
        print("  ✗ No Bronze files found! Run: python pipeline/01_bronze.py")
        sys.exit(1)
    print(f"  {len(bronze_files)} Bronze files | {len(zones)} zones loaded")

    all_stats = []
    t_total = time.time()
    for f in bronze_files:
        all_stats.append(process_file(f, zones))

    elapsed_total = time.time() - t_total
    ok = [s for s in all_stats if s.get("status") == "OK"]
    total_in = sum(s.get("rows_in", 0) for s in ok)
    total_out = sum(s.get("rows_out", 0) for s in ok)

    report = {"files_ok": len(ok), "total_rows_in": total_in, "total_rows_out": total_out,
              "overall_retention_pct": round(100 * total_out / total_in, 2) if total_in else 0,
              "elapsed_sec": round(elapsed_total, 2), "files": all_stats}
    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print()
    print("=" * 60)
    print("  SILVER COMPLETE")
    print(f"  {total_in:,} → {total_out:,} rows | {report['overall_retention_pct']}% | {elapsed_total:.1f}s")
    print("  Next: python pipeline/03_gold.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
