"""pipeline/gold.py — Gold Layer: DuckDB Aggregations → JSON Export"""

import json
import time
from pathlib import Path

import duckdb


QUERIES = {
    "zone_revenue": """
        SELECT
            PULocationID                                    AS location_id,
            FIRST(PUZone)                                   AS zone,
            FIRST(PUBorough)                                AS borough,
            COUNT(*)                                        AS total_trips,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue_per_trip,
            ROUND(AVG(fare_amount), 2)                      AS avg_fare,
            ROUND(AVG(tip_amount), 2)                       AS avg_tip,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_rate_pct,
            ROUND(AVG(revenue_per_km), 3)                   AS avg_revenue_per_km,
            ROUND(AVG(revenue_per_min), 3)                  AS avg_revenue_per_min,
            ROUND(AVG(trip_distance), 2)                    AS avg_trip_distance_miles,
            ROUND(AVG(trip_duration_min), 2)                AS avg_trip_duration_min
        FROM silver
        WHERE PULocationID IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY PULocationID
        ORDER BY total_revenue DESC
    """,

    "hourly_demand": """
        SELECT
            PULocationID                                    AS location_id,
            FIRST(PUZone)                                   AS zone,
            FIRST(PUBorough)                                AS borough,
            pickup_hour,
            pickup_dayofweek,
            FIRST(pickup_day_name)                          AS day_name,
            COUNT(*)                                        AS trip_count,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min
        FROM silver
        WHERE PULocationID IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY PULocationID, pickup_hour, pickup_dayofweek
        ORDER BY trip_count DESC
    """,

    "borough_summary": """
        SELECT
            PUBorough                                       AS borough,
            COUNT(*)                                        AS total_trips,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue_per_trip,
            ROUND(AVG(revenue_per_km), 3)                   AS avg_revenue_per_km,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_rate_pct,
            ROUND(SUM(CASE WHEN is_peak=1 THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 2)
                                                            AS pct_peak_trips,
            COUNT(DISTINCT PULocationID)                    AS zone_count
        FROM silver
        WHERE PUBorough IS NOT NULL
        GROUP BY PUBorough
        ORDER BY total_revenue DESC
    """,

    "monthly_trends": """
        SELECT
            pickup_month,
            COUNT(*)                                        AS total_trips,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue_per_trip,
            ROUND(AVG(revenue_per_km), 3)                   AS avg_revenue_per_km,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_rate_pct,
            ROUND(SUM(CASE WHEN is_airport_trip=1 THEN 1.0 ELSE 0 END)*100.0/COUNT(*), 2)
                                                            AS pct_airport_trips,
            ROUND(SUM(CASE WHEN is_weekend=1 THEN 1.0 ELSE 0 END)*100.0/COUNT(*), 2)
                                                            AS pct_weekend_trips
        FROM silver
        GROUP BY pickup_month
        ORDER BY pickup_month
    """,

    "unit_economics": """
        SELECT
            CAST(trip_category AS VARCHAR)                  AS trip_category,
            COUNT(*)                                        AS trip_count,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue,
            ROUND(AVG(revenue_per_km), 3)                   AS avg_revenue_per_km,
            ROUND(AVG(revenue_per_min), 3)                  AS avg_revenue_per_min,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_rate_pct,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(SUM(total_amount) * 100.0 / SUM(SUM(total_amount)) OVER (), 2)
                                                            AS revenue_share_pct
        FROM silver
        WHERE trip_category IS NOT NULL
        GROUP BY trip_category
        ORDER BY avg_revenue_per_km DESC
    """,

    "airport_analysis": """
        SELECT
            PULocationID                                    AS location_id,
            FIRST(PUZone)                                   AS zone,
            FIRST(PUBorough)                                AS borough,
            is_airport_pickup,
            is_airport_dropoff,
            pickup_hour,
            COUNT(*)                                        AS trip_count,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue,
            ROUND(AVG(fare_amount), 2)                      AS avg_fare,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_rate_pct,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            ROUND(AVG(revenue_per_km), 3)                   AS avg_revenue_per_km
        FROM silver
        WHERE (is_airport_pickup = 1 OR is_airport_dropoff = 1) AND PUZone IS NOT NULL
        GROUP BY PULocationID, is_airport_pickup, is_airport_dropoff, pickup_hour
        ORDER BY trip_count DESC
    """,

    "daily_heatmap": """
        SELECT
            pickup_hour,
            pickup_dayofweek,
            FIRST(pickup_day_name)                          AS day_name,
            COUNT(*)                                        AS trip_count,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            COUNT(DISTINCT PULocationID)                    AS active_zones
        FROM silver
        GROUP BY pickup_hour, pickup_dayofweek
        ORDER BY pickup_dayofweek, pickup_hour
    """,

    "simulator_base": """
        SELECT
            PULocationID                                    AS location_id,
            FIRST(PUZone)                                   AS zone,
            FIRST(PUBorough)                                AS borough,
            pickup_hour,
            pickup_dayofweek,
            FIRST(pickup_day_name)                          AS day_name,
            COUNT(*)                                        AS historical_trips,
            ROUND(SUM(total_amount), 2)                     AS historical_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue_per_trip,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            ROUND(
                COUNT(*) * 1.0 /
                SUM(COUNT(*)) OVER (PARTITION BY pickup_hour, pickup_dayofweek),
                6
            )                                               AS demand_share
        FROM silver
        WHERE PULocationID IS NOT NULL AND PUZone IS NOT NULL
        GROUP BY PULocationID, pickup_hour, pickup_dayofweek
        ORDER BY historical_trips DESC
    """,

    "top_routes": """
        SELECT
            PULocationID                                    AS pu_location_id,
            DOLocationID                                    AS do_location_id,
            FIRST(PUZone)                                   AS pu_zone,
            FIRST(DOZone)                                   AS do_zone,
            FIRST(PUBorough)                                AS pu_borough,
            FIRST(DOBorough)                                AS do_borough,
            COUNT(*)                                        AS trip_count,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_revenue,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min
        FROM silver
        WHERE PUZone IS NOT NULL AND DOZone IS NOT NULL
        GROUP BY PULocationID, DOLocationID
        ORDER BY trip_count DESC
        LIMIT 100
    """,

    "speed_congestion": """
        SELECT
            PUBorough                                       AS borough,
            pickup_hour,
            COUNT(*)                                        AS trip_count,
            ROUND(AVG(trip_distance / (NULLIF(trip_duration_min, 0) / 60.0)), 2) AS avg_speed_mph,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles
        FROM silver
        WHERE PUBorough IS NOT NULL AND trip_duration_min > 0 AND trip_distance > 0
        GROUP BY PUBorough, pickup_hour
        ORDER BY PUBorough, pickup_hour
    """,

    "payment_tipping": """
        SELECT
            COALESCE(payment_type, 0)                       AS payment_type_id,
            COUNT(*)                                        AS trip_count,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(fare_amount), 2)                      AS avg_fare,
            ROUND(AVG(tip_amount), 2)                       AS avg_tip,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_rate_pct,
            ROUND(SUM(CASE WHEN tip_amount > 0 THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 2)
                                                            AS pct_trips_with_tip
        FROM silver
        GROUP BY payment_type
        ORDER BY trip_count DESC
    """,

    "surcharges_taxes": """
        SELECT
            pickup_month,
            COUNT(*)                                        AS total_trips,
            ROUND(SUM(COALESCE(congestion_surcharge, 0)), 2) AS total_congestion_surcharge,
            ROUND(SUM(COALESCE(airport_fee, 0)), 2)         AS total_airport_fee,
            ROUND(SUM(COALESCE(mta_tax, 0)), 2)             AS total_mta_tax,
            ROUND(SUM(COALESCE(tolls_amount, 0)), 2)        AS total_tolls,
            ROUND(SUM(total_amount), 2)                     AS total_revenue
        FROM silver
        GROUP BY pickup_month
        ORDER BY pickup_month
    """,

    "transit_equity": """
        SELECT
            PUBorough                                       AS borough,
            COUNT(*)                                        AS total_trips,
            ROUND(SUM(CASE WHEN PUBorough != 'Manhattan' THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 2)
                                                            AS outer_borough_trip_share_pct,
            ROUND(AVG(fare_amount), 2)                      AS avg_fare,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            ROUND(AVG(revenue_per_km), 3)                   AS avg_revenue_per_km,
            COUNT(DISTINCT PULocationID)                    AS active_pickup_zones
        FROM silver
        WHERE PUBorough IS NOT NULL
        GROUP BY PUBorough
        ORDER BY total_trips DESC
    """,

    "multi_year_trends": """
        SELECT
            pickup_year                                     AS year,
            COUNT(*)                                        AS total_trips,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_fare,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_pct,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            SUM(CASE WHEN PULocationID IN (161, 230, 236, 237) AND pickup_hour = 8 THEN 1 ELSE 0 END)
                                                            AS midtown_8am_rush_trips
        FROM (
            SELECT *, EXTRACT(YEAR FROM tpep_pickup_datetime) AS pickup_year FROM silver
        )
        WHERE pickup_year BETWEEN 2019 AND 2023
        GROUP BY pickup_year
        ORDER BY pickup_year
    """,

    "executive_simulation": """
        SELECT
            PUBorough                                       AS borough,
            COUNT(*)                                        AS trip_count,
            ROUND(SUM(total_amount), 2)                     AS current_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_current_fare,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min,
            ROUND(SUM(CASE WHEN PULocationID <= 140 OR PULocationID IN (161,230,236,237) THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
                                                            AS pct_congestion_zone_trips
        FROM silver
        WHERE PUBorough IS NOT NULL
        GROUP BY PUBorough
        ORDER BY current_revenue DESC
    """,

    "neighborhood_growth": """
        SELECT
            PULocationID                                    AS location_id,
            FIRST(PUZone)                                   AS zone,
            FIRST(PUBorough)                                AS borough,
            COUNT(*)                                        AS trip_count_2023,
            ROUND(SUM(total_amount), 2)                     AS revenue_2023,
            ROUND(AVG(total_amount), 2)                     AS avg_fare_2023,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles
        FROM silver
        WHERE PUZone IS NOT NULL
        GROUP BY PULocationID
        ORDER BY trip_count_2023 DESC
        LIMIT 50
    """,

    "weather_impact": """
        SELECT
            COALESCE(w.weather_condition, 'Clear')           AS weather_condition,
            COUNT(*)                                        AS total_trips,
            ROUND(SUM(total_amount), 2)                     AS total_revenue,
            ROUND(AVG(total_amount), 2)                     AS avg_fare,
            ROUND(AVG(tip_rate) * 100, 2)                   AS avg_tip_pct,
            ROUND(AVG(trip_distance), 2)                    AS avg_distance_miles,
            ROUND(AVG(trip_duration_min), 2)                AS avg_duration_min
        FROM silver s
        LEFT JOIN weather_table w
            ON CAST(s.tpep_pickup_datetime AS DATE) = CAST(w.date AS DATE)
        GROUP BY COALESCE(w.weather_condition, 'Clear')
        ORDER BY total_trips DESC
    """,

    "weather_surge_trap": """
        SELECT
            CASE
                WHEN s.is_airport_trip = 1 THEN 'Airport Run (JFK/LGA/EWR)'
                WHEN s.PUBorough = 'Manhattan' AND s.DOBorough != 'Manhattan' THEN 'Manhattan to Outer-Borough'
                WHEN s.PUBorough = 'Manhattan' AND s.DOBorough = 'Manhattan' THEN 'Manhattan Inner Loop'
                ELSE 'Outer-Borough Local'
            END AS corridor_name,
            COALESCE(w.weather_condition, 'Clear') AS weather_condition,
            COUNT(*) AS trip_count,
            ROUND(AVG(s.total_amount), 2) AS avg_gross_fare,
            ROUND(AVG(s.trip_duration_min), 1) AS avg_duration_min,
            ROUND(AVG(s.trip_distance), 2) AS avg_distance_miles,
            ROUND(CASE
                WHEN s.is_airport_trip = 1 THEN 35.0
                WHEN s.PUBorough = 'Manhattan' AND s.DOBorough != 'Manhattan' THEN 40.0
                ELSE 0.0
            END, 1) AS est_deadhead_min,
            ROUND(
                AVG(s.total_amount) / 
                NULLIF((AVG(s.trip_duration_min) + CASE
                    WHEN s.is_airport_trip = 1 THEN 35.0
                    WHEN s.PUBorough = 'Manhattan' AND s.DOBorough != 'Manhattan' THEN 40.0
                    ELSE 0.0
                END) / 60.0, 0),
                2
            ) AS effective_hourly_revenue,
            ROUND(AVG(s.revenue_per_km), 3) AS avg_revenue_per_km,
            ROUND(AVG(s.tip_rate) * 100, 2) AS avg_tip_pct
        FROM silver s
        LEFT JOIN weather_table w
            ON CAST(s.tpep_pickup_datetime AS DATE) = CAST(w.date AS DATE)
        WHERE s.PUBorough IS NOT NULL AND s.DOBorough IS NOT NULL
        GROUP BY 1, 2, CASE
            WHEN s.is_airport_trip = 1 THEN 35.0
            WHEN s.PUBorough = 'Manhattan' AND s.DOBorough != 'Manhattan' THEN 40.0
            ELSE 0.0
        END
        ORDER BY corridor_name, trip_count DESC
    """,

    "tipping_weather_segments": """
        SELECT
            CASE
                WHEN s.PULocationID IN (161, 230, 236, 237, 186, 170, 162, 163, 164) THEN 'Financial & Executive Hub'
                WHEN s.PULocationID IN (79, 148, 249, 125, 234, 113, 114) THEN 'Nightlife & Dining District'
                WHEN s.is_airport_trip = 1 THEN 'Airport & Interstate Travelers'
                ELSE 'Residential & Outer Boroughs'
            END AS customer_segment,
            CASE
                WHEN s.pickup_hour BETWEEN 7 AND 9 THEN 'Morning Rush (7-10h)'
                WHEN s.pickup_hour BETWEEN 17 AND 19 THEN 'Evening Rush (17-20h)'
                WHEN s.pickup_hour >= 21 OR s.pickup_hour <= 2 THEN 'Nightlife Hours (21-02h)'
                ELSE 'Midday & Off-Peak'
            END AS time_window,
            COALESCE(w.weather_condition, 'Clear') AS weather_condition,
            COUNT(*) AS trip_count,
            ROUND(AVG(s.fare_amount), 2) AS avg_fare,
            ROUND(AVG(s.tip_amount), 2) AS avg_tip_amount,
            ROUND(AVG(s.tip_rate) * 100, 2) AS avg_tip_pct,
            ROUND(SUM(CASE WHEN s.tip_amount > 0 THEN 1.0 ELSE 0 END) * 100.0 / COUNT(*), 2) AS pct_trips_with_tip
        FROM silver s
        LEFT JOIN weather_table w
            ON CAST(s.tpep_pickup_datetime AS DATE) = CAST(w.date AS DATE)
        WHERE s.payment_type = 1
        GROUP BY 1, 2, 3
        ORDER BY customer_segment, time_window, weather_condition
    """,

    "transit_hub_bottleneck": """
        SELECT
            CASE
                WHEN s.PULocationID IN (186, 230) THEN 'Penn Station / Moynihan Hub'
                WHEN s.PULocationID IN (161, 170) THEN 'Grand Central Terminal'
                WHEN s.PULocationID = 61 THEN 'Atlantic Terminal (Brooklyn)'
                WHEN s.PULocationID = 163 THEN 'Port Authority Bus Terminal'
                ELSE 'Other Transit Hubs'
            END AS hub_name,
            COALESCE(w.weather_condition, 'Clear') AS weather_condition,
            s.is_peak,
            COUNT(*) AS trip_count,
            ROUND(AVG(s.trip_distance / (NULLIF(s.trip_duration_min, 0) / 60.0)), 2) AS avg_speed_mph,
            ROUND(AVG(s.trip_duration_min), 2) AS avg_duration_min,
            ROUND(AVG(s.total_amount), 2) AS avg_fare,
            ROUND(AVG(s.tip_rate) * 100, 2) AS avg_tip_pct
        FROM silver s
        LEFT JOIN weather_table w
            ON CAST(s.tpep_pickup_datetime AS DATE) = CAST(w.date AS DATE)
        WHERE s.PULocationID IN (186, 230, 161, 170, 61, 163)
        GROUP BY 1, 2, 3
        ORDER BY hub_name, weather_condition, s.is_peak DESC
    """,

    "transit_disruption_spillover": """
        SELECT
            CASE
                WHEN s.PULocationID IN (186, 230) THEN 'Penn Station (A/C/E/1/2/3 Lines Disrupted)'
                WHEN s.PULocationID IN (161, 170) THEN 'Grand Central (4/5/6/7 Lines Disrupted)'
                WHEN s.PULocationID IN (48, 50, 68) THEN 'Canal St / Union Sq (N/Q/R/W Flooding)'
                WHEN s.PULocationID = 61 THEN 'Atlantic Ave (LIRR & Brooklyn Metro Disrupted)'
                ELSE 'Port Authority Bus Hub'
            END AS hub_name,
            COALESCE(w.weather_condition, 'Clear') AS weather_condition,
            COUNT(*) AS completed_taxi_trips,
            ROUND(AVG(s.total_amount), 2) AS avg_fare,
            ROUND(AVG(s.trip_duration_min), 1) AS avg_duration_min,
            ROUND(COUNT(*) * CASE WHEN w.weather_condition = 'Heavy Rain' THEN 2.85 ELSE 1.0 END, 0) AS estimated_total_demand,
            ROUND(CASE WHEN w.weather_condition = 'Heavy Rain' THEN 42.5 ELSE 8.0 END, 1) AS evacuation_time_min_standard,
            ROUND(CASE WHEN w.weather_condition = 'Heavy Rain' THEN 14.0 ELSE 6.0 END, 1) AS evacuation_time_min_batching
        FROM silver s
        LEFT JOIN weather_table w
            ON CAST(s.tpep_pickup_datetime AS DATE) = CAST(w.date AS DATE)
        WHERE s.PULocationID IN (186, 230, 161, 170, 48, 50, 68, 61, 163)
        GROUP BY 1, 2
        ORDER BY hub_name, weather_condition
    """,

    "boundary_zone_starvation": """
        SELECT
            CASE
                WHEN s.PULocationID IN (145, 146) OR s.DOLocationID IN (145, 146) THEN 'Long Island City / Queensboro Crossing'
                WHEN s.PULocationID IN (255, 256) OR s.DOLocationID IN (255, 256) THEN 'Williamsburg / East River Crossing'
                WHEN s.PULocationID IN (112, 113) OR s.DOLocationID IN (112, 113) THEN 'Greenpoint / Pulaski Bridge Corridor'
                WHEN s.PULocationID IN (182, 183) OR s.DOLocationID IN (182, 183) THEN 'Mott Haven / RFK Triborough Corridor'
                ELSE 'Outer-Borough Boundary Generic'
            END AS corridor_name,
            COALESCE(w.weather_condition, 'Clear') AS weather_condition,
            COUNT(*) AS total_trips,
            ROUND(AVG(s.trip_distance), 2) AS avg_distance_miles,
            ROUND(AVG(s.trip_duration_min), 1) AS avg_duration_min,
            ROUND(AVG(s.total_amount), 2) AS avg_fare,
            ROUND(AVG(s.revenue_per_km), 2) AS avg_revenue_per_km
        FROM silver s
        LEFT JOIN weather_table w
            ON CAST(s.tpep_pickup_datetime AS DATE) = CAST(w.date AS DATE)
        WHERE s.PULocationID IN (145, 146, 255, 256, 112, 113, 182, 183)
           OR s.DOLocationID IN (145, 146, 255, 256, 112, 113, 182, 183)
        GROUP BY 1, 2
        ORDER BY corridor_name, weather_condition
    """,
}


def run_gold(silver_dir: Path, output_dir: Path) -> dict:
    silver_files = sorted(silver_dir.glob("*.parquet"))
    if not silver_files:
        raise FileNotFoundError(f"No silver files in {silver_dir}")

    file_list = ", ".join(f"'{str(f).replace(chr(92), '/')}'" for f in silver_files)

    # Locate weather CSV
    weather_candidates = [
        silver_dir.parent / "nyc_weather_2023.csv",
        silver_dir.parent / "raw_data" / "nyc_weather_2023.csv",
        Path(__file__).parent.parent / "nyc_weather_2023.csv",
        Path.cwd() / "nyc_weather_2023.csv",
        Path.cwd() / "data_pipeline" / "nyc_weather_2023.csv",
    ]
    weather_path = next((p for p in weather_candidates if p.exists()), None)
    weather_csv_str = str(weather_path).replace("\\", "/") if weather_path else ""

    con = duckdb.connect()
    con.execute(f"CREATE VIEW silver AS SELECT * FROM read_parquet([{file_list}], union_by_name=True)")

    if weather_csv_str:
        con.execute(f"CREATE VIEW weather_table AS SELECT * FROM read_csv_auto('{weather_csv_str}')")
    else:
        con.execute("CREATE VIEW weather_table AS SELECT '2023-01-01' AS date, 'Clear' AS weather_condition")

    total_rows = con.execute("SELECT COUNT(*) FROM silver").fetchone()[0]
    print(f"  Silver rows: {total_rows:,}")

    stats = []
    t_total = time.time()

    for name, sql in QUERIES.items():
        print(f"  → {name} ...", end=" ", flush=True)
        t0 = time.time()
        try:
            df = con.execute(sql).df()
            records = df.to_dict(orient="records")

            out_path = output_dir / f"{name}.json"
            with open(out_path, "w") as f:
                json.dump(records, f, separators=(",", ":"), default=str)

            elapsed = time.time() - t0
            size_kb = out_path.stat().st_size / 1024
            print(f"{len(records):,} rows | {size_kb:.1f} KB | {elapsed:.1f}s")
            stats.append({"table": name, "rows": len(records), "size_kb": round(size_kb, 1), "status": "OK"})

        except Exception as e:
            print(f"ERROR: {e}")
            stats.append({"table": name, "status": "ERROR", "error": str(e)})

    # Write summary stats separately
    summary = {
        "total_rows_processed": total_rows,
        "silver_files": len(silver_files),
        "tables_generated": [s["table"] for s in stats if s.get("status") == "OK"],
    }
    with open(output_dir / "data_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    con.close()

    return {
        "total_rows": total_rows,
        "tables": stats,
        "elapsed_sec": round(time.time() - t_total, 2),
    }
