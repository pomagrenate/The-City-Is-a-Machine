"""
03_gold.py — Gold Layer: Pre-Aggregation for Business Intelligence

Reads Silver Parquet files and produces business-ready summary tables
that power the dashboard tabs. Uses DuckDB for fast SQL aggregations.

Output tables (data/gold/):
  - gold_zone_revenue.parquet       — Revenue metrics per zone
  - gold_hourly_demand.parquet      — Demand by hour × day_of_week × zone
  - gold_peak_analysis.parquet      — Peak vs off-peak comparison
  - gold_unit_economics.parquet     — Revenue efficiency by trip category
  - gold_borough_summary.parquet    — Borough-level summary
  - gold_monthly_trends.parquet     — Month-over-month trends
  - gold_airport_analysis.parquet   — Airport zone deep dive
  - gold_daily_heatmap.parquet      — Hour × DayOfWeek demand heatmap

Usage:
    python pipeline/03_gold.py
"""

import json
import sys
import time
from pathlib import Path

import duckdb

ROOT = Path(__file__).parent.parent
SILVER_DIR = ROOT / "data" / "silver"
GOLD_DIR   = ROOT / "data" / "gold"
GOLD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_PATH = GOLD_DIR / "_gold_report.json"


def run_gold(con: duckdb.DuckDBPyConnection, name: str, sql: str) -> dict:
    """Execute a gold query, save to Parquet, return stats."""
    out_path = GOLD_DIR / f"{name}.parquet"
    print(f"  Building: {name} ...", end=" ", flush=True)
    t0 = time.time()
    df = con.execute(sql).df()
    df.to_parquet(out_path, index=False, engine="pyarrow")
    elapsed = time.time() - t0
    size_kb = out_path.stat().st_size / 1024
    print(f"{len(df):,} rows | {size_kb:.1f} KB | {elapsed:.1f}s")
    return {"table": name, "rows": len(df), "size_kb": round(size_kb, 1), "elapsed_sec": round(elapsed, 2)}


def main():
    print("=" * 60)
    print("  THE CITY IS A MACHINE — Gold Pipeline")
    print("=" * 60)

    silver_files = sorted(SILVER_DIR.glob("yellow_tripdata_*.parquet"))
    if not silver_files:
        print("  ✗ No Silver files found! Run: python pipeline/02_silver.py")
        sys.exit(1)

    print(f"  Silver files: {len(silver_files)}")

    # Build a glob pattern for DuckDB to read all silver files
    silver_glob = str(SILVER_DIR / "yellow_tripdata_*.parquet").replace("\\", "/")

    con = duckdb.connect()

    # Register as a view
    con.execute(f"CREATE VIEW silver AS SELECT * FROM read_parquet('{silver_glob}')")
    total_rows = con.execute("SELECT COUNT(*) FROM silver").fetchone()[0]
    print(f"  Total silver rows available: {total_rows:,}")
    print()

    stats = []
    t_total = time.time()

    # ── 1. Zone Revenue ───────────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_zone_revenue", """
        SELECT
            PULocationID                          AS location_id,
            FIRST(PUBorough)                      AS borough,
            FIRST(PUZone)                         AS zone,
            COUNT(*)                              AS total_trips,
            ROUND(SUM(total_amount), 2)           AS total_revenue,
            ROUND(AVG(total_amount), 4)           AS avg_revenue_per_trip,
            ROUND(AVG(fare_amount), 4)            AS avg_fare,
            ROUND(AVG(tip_amount), 4)             AS avg_tip,
            ROUND(AVG(tip_rate) * 100, 2)         AS avg_tip_rate_pct,
            ROUND(AVG(revenue_per_km), 4)         AS avg_revenue_per_km,
            ROUND(AVG(revenue_per_min), 4)        AS avg_revenue_per_min,
            ROUND(AVG(trip_distance), 4)          AS avg_trip_distance_miles,
            ROUND(AVG(trip_duration_min), 2)      AS avg_trip_duration_min,
            ROUND(SUM(total_amount) / COUNT(*), 4) AS revenue_per_trip
        FROM silver
        WHERE PULocationID IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY PULocationID
        ORDER BY total_revenue DESC
    """))

    # ── 2. Hourly Demand ──────────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_hourly_demand", """
        SELECT
            PULocationID                     AS location_id,
            FIRST(PUBorough)                 AS borough,
            FIRST(PUZone)                    AS zone,
            pickup_hour,
            pickup_dayofweek,
            pickup_day_name,
            COUNT(*)                         AS trip_count,
            ROUND(SUM(total_amount), 2)      AS total_revenue,
            ROUND(AVG(total_amount), 4)      AS avg_revenue,
            ROUND(AVG(trip_duration_min), 2) AS avg_duration_min
        FROM silver
        WHERE PULocationID IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY PULocationID, pickup_hour, pickup_dayofweek, pickup_day_name
        ORDER BY trip_count DESC
    """))

    # ── 3. Peak Analysis ──────────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_peak_analysis", """
        SELECT
            PULocationID                          AS location_id,
            FIRST(PUBorough)                      AS borough,
            FIRST(PUZone)                         AS zone,
            is_peak,
            is_weekend,
            COUNT(*)                              AS trip_count,
            ROUND(SUM(total_amount), 2)           AS total_revenue,
            ROUND(AVG(total_amount), 4)           AS avg_revenue,
            ROUND(AVG(tip_rate) * 100, 2)         AS avg_tip_rate_pct,
            ROUND(AVG(revenue_per_min), 4)        AS avg_revenue_per_min,
            ROUND(AVG(trip_duration_min), 2)      AS avg_duration_min
        FROM silver
        WHERE PULocationID IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY PULocationID, is_peak, is_weekend
        ORDER BY total_revenue DESC
    """))

    # ── 4. Unit Economics ─────────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_unit_economics", """
        SELECT
            trip_category,
            PULocationID                           AS location_id,
            FIRST(PUBorough)                       AS borough,
            FIRST(PUZone)                          AS zone,
            COUNT(*)                               AS trip_count,
            ROUND(AVG(trip_distance), 4)           AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)       AS avg_duration_min,
            ROUND(AVG(total_amount), 4)            AS avg_revenue,
            ROUND(AVG(revenue_per_km), 4)          AS avg_revenue_per_km,
            ROUND(AVG(revenue_per_min), 4)         AS avg_revenue_per_min,
            ROUND(AVG(tip_rate) * 100, 2)          AS avg_tip_rate_pct,
            ROUND(SUM(total_amount), 2)            AS total_revenue
        FROM silver
        WHERE trip_category IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY trip_category, PULocationID
        ORDER BY avg_revenue_per_km DESC
    """))

    # ── 5. Borough Summary ────────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_borough_summary", """
        SELECT
            PUBorough                              AS borough,
            COUNT(*)                               AS total_trips,
            ROUND(SUM(total_amount), 2)            AS total_revenue,
            ROUND(AVG(total_amount), 4)            AS avg_revenue_per_trip,
            ROUND(AVG(revenue_per_km), 4)          AS avg_revenue_per_km,
            ROUND(AVG(trip_distance), 4)           AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)       AS avg_duration_min,
            ROUND(AVG(tip_rate) * 100, 2)          AS avg_tip_rate_pct,
            ROUND(SUM(CASE WHEN is_peak=1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
                                                   AS pct_peak_trips,
            COUNT(DISTINCT PULocationID)           AS zone_count
        FROM silver
        WHERE PUBorough IS NOT NULL
        GROUP BY PUBorough
        ORDER BY total_revenue DESC
    """))

    # ── 6. Monthly Trends ─────────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_monthly_trends", """
        SELECT
            pickup_month,
            COUNT(*)                               AS total_trips,
            ROUND(SUM(total_amount), 2)            AS total_revenue,
            ROUND(AVG(total_amount), 4)            AS avg_revenue_per_trip,
            ROUND(AVG(revenue_per_km), 4)          AS avg_revenue_per_km,
            ROUND(AVG(trip_duration_min), 2)       AS avg_duration_min,
            ROUND(AVG(tip_rate) * 100, 2)          AS avg_tip_rate_pct,
            ROUND(SUM(CASE WHEN is_airport_trip=1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
                                                   AS pct_airport_trips
        FROM silver
        GROUP BY pickup_month
        ORDER BY pickup_month
    """))

    # ── 7. Airport Analysis ───────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_airport_analysis", """
        SELECT
            PULocationID                           AS location_id,
            FIRST(PUBorough)                       AS borough,
            FIRST(PUZone)                          AS zone,
            is_airport_pickup,
            is_airport_dropoff,
            pickup_hour,
            pickup_dayofweek,
            COUNT(*)                               AS trip_count,
            ROUND(AVG(total_amount), 4)            AS avg_revenue,
            ROUND(AVG(fare_amount), 4)             AS avg_fare,
            ROUND(AVG(tip_rate) * 100, 2)          AS avg_tip_rate_pct,
            ROUND(AVG(trip_distance), 4)           AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)       AS avg_duration_min,
            ROUND(AVG(revenue_per_km), 4)          AS avg_revenue_per_km
        FROM silver
        WHERE (is_airport_pickup = 1 OR is_airport_dropoff = 1)
          AND PUZone IS NOT NULL
        GROUP BY PULocationID, is_airport_pickup, is_airport_dropoff, pickup_hour, pickup_dayofweek
        ORDER BY trip_count DESC
    """))

    # ── 8. Daily Heatmap ──────────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_daily_heatmap", """
        SELECT
            pickup_hour,
            pickup_dayofweek,
            pickup_day_name,
            COUNT(*)                               AS trip_count,
            ROUND(SUM(total_amount), 2)            AS total_revenue,
            ROUND(AVG(total_amount), 4)            AS avg_revenue,
            ROUND(AVG(trip_duration_min), 2)       AS avg_duration_min,
            COUNT(DISTINCT PULocationID)           AS active_zones
        FROM silver
        GROUP BY pickup_hour, pickup_dayofweek, pickup_day_name
        ORDER BY pickup_dayofweek, pickup_hour
    """))

    # ── 9. Simulator Base Data ─────────────────────────────────────────────────
    stats.append(run_gold(con, "gold_simulator_base", """
        SELECT
            PULocationID                           AS location_id,
            FIRST(PUBorough)                       AS borough,
            FIRST(PUZone)                          AS zone,
            pickup_hour,
            pickup_dayofweek,
            pickup_day_name,
            COUNT(*)                               AS historical_trips,
            ROUND(SUM(total_amount), 2)            AS historical_revenue,
            ROUND(AVG(total_amount), 4)            AS avg_revenue_per_trip,
            ROUND(AVG(trip_duration_min), 2)       AS avg_duration_min,
            ROUND(COUNT(*) * 1.0 /
                  SUM(COUNT(*)) OVER (PARTITION BY pickup_hour, pickup_dayofweek), 6)
                                                   AS demand_share
        FROM silver
        WHERE PULocationID IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY PULocationID, pickup_hour, pickup_dayofweek, pickup_day_name
        ORDER BY historical_trips DESC
    """))

    con.close()

    elapsed_total = time.time() - t_total
    report = {"tables": stats, "total_elapsed_sec": round(elapsed_total, 2)}
    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    print()
    print("=" * 60)
    print("  GOLD PIPELINE COMPLETE")
    print("=" * 60)
    for s in stats:
        print(f"  {s['table']:<35} {s['rows']:>8,} rows  {s['size_kb']:>8.1f} KB")
    print(f"\n  Total elapsed: {elapsed_total:.1f}s")
    print("\n  Next step:")
    print("    streamlit run dashboard/app.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
