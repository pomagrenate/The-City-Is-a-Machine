"""
generate_sample_json.py — Generate sample gold JSON files for local development/preview

Runs locally in seconds without downloading multi-gigabyte files.
Outputs sample JSON files to web/public/data/ so the Next.js app can be run and tested immediately.
"""

import json
import random
from pathlib import Path

PUBLIC_DATA_DIR = Path(__file__).parent.parent / "web" / "public" / "data"
PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']
MANHATTAN_ZONES = [
  'Upper East Side South', 'Midtown Center', 'Financial District South',
  'Penn Station/Madison Sq West', 'Times Sq/Theatre District', 'East Village',
  'Upper West Side South', 'Gramercy', 'Greenwich Village North', 'Murray Hill'
]
QUEENS_ZONES = ['JFK Airport', 'LaGuardia Airport', 'Astoria', 'Long Island City', 'Flushing']
BROOKLYN_ZONES = ['Williamsburg', 'DUMBO/Vinegar Hill', 'Park Slope', 'Downtown Brooklyn', 'Bushwick']
BRONX_ZONES = ['Mott Haven', 'Riverdale', 'Yankee Stadium']
STATEN_ZONES = ['StGeorge', 'West New Brighton']

DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

def generate_sample_data():
  print(f"Generating realistic sample JSON files into: {PUBLIC_DATA_DIR}")

  # 1. Zone Revenue
  all_zones_list = []
  loc_id = 1
  for borough, zlist in [
    ('Manhattan', MANHATTAN_ZONES),
    ('Queens', QUEENS_ZONES),
    ('Brooklyn', BROOKLYN_ZONES),
    ('Bronx', BRONX_ZONES),
    ('Staten Island', STATEN_ZONES)
  ]:
    for z in zlist:
      base_trips = random.randint(150000, 1800000) if borough == 'Manhattan' else random.randint(30000, 450000)
      avg_fare = round(random.uniform(14.5, 32.0), 2)
      avg_tip = round(avg_fare * random.uniform(0.12, 0.22), 2)
      avg_rev = round(avg_fare + avg_tip + random.uniform(1.0, 3.5), 2)
      total_rev = round(base_trips * avg_rev, 2)
      avg_dist = round(random.uniform(1.8, 8.5), 2)
      avg_dur = round(random.uniform(8.0, 28.0), 1)

      all_zones_list.append({
        'location_id': loc_id,
        'zone': z,
        'borough': borough,
        'total_trips': base_trips,
        'total_revenue': total_rev,
        'avg_revenue_per_trip': avg_rev,
        'avg_fare': avg_fare,
        'avg_tip': avg_tip,
        'avg_tip_rate_pct': round((avg_tip / avg_fare) * 100, 2),
        'avg_revenue_per_km': round(avg_rev / (avg_dist * 1.60934), 2),
        'avg_revenue_per_min': round(avg_rev / avg_dur, 2),
        'avg_trip_distance_miles': avg_dist,
        'avg_trip_duration_min': avg_dur
      })
      loc_id += 1

  all_zones_list.sort(key=lambda x: x['total_revenue'], reverse=True)
  with open(PUBLIC_DATA_DIR / "zone_revenue.json", "w") as f:
    json.dump(all_zones_list, f, indent=2)

  # 2. Borough Summary
  borough_summary = []
  for b in BOROUGHS:
    b_zones = [z for z in all_zones_list if z['borough'] == b]
    trips = sum(z['total_trips'] for z in b_zones)
    rev = sum(z['total_revenue'] for z in b_zones)
    borough_summary.append({
      'borough': b,
      'total_trips': trips,
      'total_revenue': round(rev, 2),
      'avg_revenue_per_trip': round(rev / trips, 2) if trips else 0,
      'avg_revenue_per_km': round(sum(z['avg_revenue_per_km'] for z in b_zones) / len(b_zones), 2) if b_zones else 0,
      'avg_distance_miles': round(sum(z['avg_trip_distance_miles'] for z in b_zones) / len(b_zones), 2) if b_zones else 0,
      'avg_duration_min': round(sum(z['avg_trip_duration_min'] for z in b_zones) / len(b_zones), 2) if b_zones else 0,
      'avg_tip_rate_pct': round(sum(z['avg_tip_rate_pct'] for z in b_zones) / len(b_zones), 2) if b_zones else 0,
      'pct_peak_trips': round(random.uniform(28.0, 38.0), 2),
      'zone_count': len(b_zones)
    })
  borough_summary.sort(key=lambda x: x['total_revenue'], reverse=True)
  with open(PUBLIC_DATA_DIR / "borough_summary.json", "w") as f:
    json.dump(borough_summary, f, indent=2)

  # 3. Monthly Trends
  monthly_trends = []
  for m in range(1, 13):
    trips = random.randint(2800000, 3400000)
    avg_rev = round(random.uniform(21.0, 24.5), 2)
    monthly_trends.append({
      'pickup_month': m,
      'total_trips': trips,
      'total_revenue': round(trips * avg_rev, 2),
      'avg_revenue_per_trip': avg_rev,
      'avg_revenue_per_km': round(random.uniform(4.8, 5.6), 2),
      'avg_duration_min': round(random.uniform(14.5, 17.2), 1),
      'avg_tip_rate_pct': round(random.uniform(15.2, 17.8), 2),
      'pct_airport_trips': round(random.uniform(5.2, 7.8), 2),
      'pct_weekend_trips': round(random.uniform(24.0, 29.0), 2)
    })
  with open(PUBLIC_DATA_DIR / "monthly_trends.json", "w") as f:
    json.dump(monthly_trends, f, indent=2)

  # 4. Daily Heatmap
  daily_heatmap = []
  for dow in range(7):
    for hour in range(24):
      if hour in [8, 9, 17, 18, 19] and dow < 5:
        multiplier = 2.2
      elif hour in [21, 22, 23] and dow in [4, 5]:
        multiplier = 1.8
      else:
        multiplier = 0.8
      count = int(random.randint(12000, 25000) * multiplier)
      daily_heatmap.append({
        'pickup_hour': hour,
        'pickup_dayofweek': dow,
        'day_name': DAY_NAMES[dow],
        'trip_count': count,
        'total_revenue': round(count * random.uniform(20.0, 25.0), 2),
        'avg_revenue': round(random.uniform(20.0, 25.0), 2),
        'avg_duration_min': round(random.uniform(12.0, 20.0), 1),
        'active_zones': random.randint(180, 240)
      })
  with open(PUBLIC_DATA_DIR / "daily_heatmap.json", "w") as f:
    json.dump(daily_heatmap, f, indent=2)

  # 5. Unit Economics
  unit_economics = [
    {
      'trip_category': 'short',
      'trip_count': 18500000,
      'avg_distance_miles': 1.25,
      'avg_duration_min': 9.2,
      'avg_revenue': 14.80,
      'avg_revenue_per_km': 7.36,
      'avg_revenue_per_min': 1.61,
      'avg_tip_rate_pct': 18.5,
      'total_revenue': 273800000.0,
      'revenue_share_pct': 34.8
    },
    {
      'trip_category': 'medium',
      'trip_count': 14200000,
      'avg_distance_miles': 4.60,
      'avg_duration_min': 18.4,
      'avg_revenue': 28.50,
      'avg_revenue_per_km': 3.85,
      'avg_revenue_per_min': 1.55,
      'avg_tip_rate_pct': 16.2,
      'total_revenue': 404700000.0,
      'revenue_share_pct': 51.5
    },
    {
      'trip_category': 'long',
      'trip_count': 2100000,
      'avg_distance_miles': 14.80,
      'avg_duration_min': 38.5,
      'avg_revenue': 51.40,
      'avg_revenue_per_km': 2.16,
      'avg_revenue_per_min': 1.34,
      'avg_tip_rate_pct': 14.8,
      'total_revenue': 107940000.0,
      'revenue_share_pct': 13.7
    }
  ]
  with open(PUBLIC_DATA_DIR / "unit_economics.json", "w") as f:
    json.dump(unit_economics, f, indent=2)

  # 6. Simulator Base
  simulator_base = []
  for z in all_zones_list[:15]:
    for dow in range(7):
      for hour in range(24):
        trips = random.randint(80, 1400)
        simulator_base.append({
          'location_id': z['location_id'],
          'zone': z['zone'],
          'borough': z['borough'],
          'pickup_hour': hour,
          'pickup_dayofweek': dow,
          'day_name': DAY_NAMES[dow],
          'historical_trips': trips,
          'historical_revenue': round(trips * z['avg_revenue_per_trip'], 2),
          'avg_revenue_per_trip': z['avg_revenue_per_trip'],
          'avg_duration_min': z['avg_trip_duration_min'],
          'demand_share': round(random.uniform(0.01, 0.12), 4)
        })
  with open(PUBLIC_DATA_DIR / "simulator_base.json", "w") as f:
    json.dump(simulator_base, f, indent=2)

  # 7. Benchmark Results
  benchmark_results = {
    'query': 'Revenue per Zone per Hour (Top 500 aggregations)',
    'analysis': {
      'finding': 'DuckDB executes vectorized OLAP queries ~8-15x faster than Pandas while using 75% less RAM. PySpark imposes ~32s startup overhead on small/medium files, making it optimal only above 50 GB+ dataset scale.',
      'crossover_estimate': '50 GB+',
      'recommendation': 'Use DuckDB for single-node analytical pipelines. Scale to PySpark when dataset size exceeds available physical RAM.'
    },
    'tiers': [
      {
        'tier': 'Tier 1 — 1 Month (~3M rows)',
        'size_gb': 0.35,
        'engines': {
          'pandas': {'elapsed_sec': 4.12, 'peak_memory_mb': 1420.0, 'notes': 'Full memory dataframe loading'},
          'duckdb': {'elapsed_sec': 0.38, 'peak_memory_mb': 180.0, 'notes': 'Vectorized Parquet scan'},
          'spark':  {'elapsed_sec': 28.5, 'peak_memory_mb': 2100.0, 'notes': 'JVM & DAG initialization cost'}
        }
      },
      {
        'tier': 'Tier 2 — 3 Months (~9M rows)',
        'size_gb': 1.05,
        'engines': {
          'pandas': {'elapsed_sec': 12.84, 'peak_memory_mb': 4280.0, 'notes': 'High RAM pressure'},
          'duckdb': {'elapsed_sec': 1.02, 'peak_memory_mb': 340.0, 'notes': 'Zero-copy memory streaming'},
          'spark':  {'elapsed_sec': 31.2, 'peak_memory_mb': 2400.0, 'notes': 'Execution speed improves but JVM fixed cost remains'}
        }
      },
      {
        'tier': 'Tier 3 — Full Year (~37M rows)',
        'size_gb': 4.20,
        'engines': {
          'pandas': {'elapsed_sec': 54.10, 'peak_memory_mb': 15800.0, 'notes': 'Near system memory limits'},
          'duckdb': {'elapsed_sec': 3.45, 'peak_memory_mb': 890.0, 'notes': 'Multithreaded vectorized engine'},
          'spark':  {'elapsed_sec': 38.6, 'peak_memory_mb': 3100.0, 'notes': 'Spark scaling advantage starts appearing'}
        }
      }
    ]
  }
  with open(PUBLIC_DATA_DIR / "benchmark_results.json", "w") as f:
    json.dump(benchmark_results, f, indent=2)

  # 8. Data Summary
  data_summary = {
    'total_rows_processed': 36842105,
    'silver_files': 12,
    'tables_generated': ['zone_revenue', 'hourly_demand', 'borough_summary', 'monthly_trends', 'unit_economics', 'daily_heatmap', 'simulator_base', 'benchmark_results']
  }
  with open(PUBLIC_DATA_DIR / "data_summary.json", "w") as f:
    json.dump(data_summary, f, indent=2)

  # 9. Market Share
  market_share = [
    {
      'mode': 'Yellow Taxi',
      'total_trips': 38310226,
      'total_revenue': 881135000.0,
      'trip_share_pct': 15.4,
      'revenue_share_pct': 16.8,
      'avg_fare': 23.00,
      'avg_trip_distance_miles': 3.4,
      'avg_duration_min': 15.8,
      'avg_tip_pct': 16.8
    },
    {
      'mode': 'Uber',
      'total_trips': 154700000,
      'total_revenue': 3248700000.0,
      'trip_share_pct': 62.1,
      'revenue_share_pct': 61.9,
      'avg_fare': 21.00,
      'avg_trip_distance_miles': 4.8,
      'avg_duration_min': 21.2,
      'avg_tip_pct': 8.4
    },
    {
      'mode': 'Lyft',
      'total_trips': 56000000,
      'total_revenue': 1120000000.0,
      'trip_share_pct': 22.5,
      'revenue_share_pct': 21.3,
      'avg_fare': 20.00,
      'avg_trip_distance_miles': 4.5,
      'avg_duration_min': 20.1,
      'avg_tip_pct': 9.1
    }
  ]
  with open(PUBLIC_DATA_DIR / "market_share.json", "w") as f:
    json.dump(market_share, f, indent=2)

  # 10. Borough Market Share
  borough_market_share = [
    {'borough': 'Manhattan', 'yellow_trips': 32100000, 'uber_trips': 45200000, 'lyft_trips': 18400000, 'total_trips': 95700000, 'yellow_share_pct': 33.5, 'uber_share_pct': 47.2, 'lyft_share_pct': 19.3},
    {'borough': 'Brooklyn',  'yellow_trips': 2100000,  'uber_trips': 48500000, 'lyft_trips': 19200000, 'total_trips': 69800000, 'yellow_share_pct': 3.0,  'uber_share_pct': 69.5, 'lyft_share_pct': 27.5},
    {'borough': 'Queens',    'yellow_trips': 3400000,  'uber_trips': 42100000, 'lyft_trips': 14800000, 'total_trips': 60300000, 'yellow_share_pct': 5.6,  'uber_share_pct': 69.8, 'lyft_share_pct': 24.6},
    {'borough': 'Bronx',     'yellow_trips': 600000,   'uber_trips': 15200000, 'lyft_trips': 3100000,  'total_trips': 18900000, 'yellow_share_pct': 3.2,  'uber_share_pct': 80.4, 'lyft_share_pct': 16.4},
    {'borough': 'Staten Island', 'yellow_trips': 110000, 'uber_trips': 3700000,  'lyft_trips': 500000,   'total_trips': 4310000,  'yellow_share_pct': 2.5,  'uber_share_pct': 85.8, 'lyft_share_pct': 11.6},
  ]
  with open(PUBLIC_DATA_DIR / "borough_market_share.json", "w") as f:
    json.dump(borough_market_share, f, indent=2)

  # 11. Top Routes
  top_routes = [
    {'pu_location_id': 237, 'do_location_id': 236, 'pu_zone': 'Upper East Side South', 'do_zone': 'Upper East Side North', 'pu_borough': 'Manhattan', 'do_borough': 'Manhattan', 'trip_count': 185000, 'total_revenue': 2220000.0, 'avg_revenue': 12.0, 'avg_distance_miles': 1.1, 'avg_duration_min': 7.8},
    {'pu_location_id': 236, 'do_location_id': 237, 'pu_zone': 'Upper East Side North', 'do_zone': 'Upper East Side South', 'pu_borough': 'Manhattan', 'do_borough': 'Manhattan', 'trip_count': 172000, 'total_revenue': 2064000.0, 'avg_revenue': 12.0, 'avg_distance_miles': 1.1, 'avg_duration_min': 7.9},
    {'pu_location_id': 161, 'do_location_id': 237, 'pu_zone': 'Midtown Center', 'do_zone': 'Upper East Side South', 'pu_borough': 'Manhattan', 'do_borough': 'Manhattan', 'trip_count': 145000, 'total_revenue': 2610000.0, 'avg_revenue': 18.0, 'avg_distance_miles': 2.2, 'avg_duration_min': 14.5},
    {'pu_location_id': 132, 'do_location_id': 230, 'pu_zone': 'JFK Airport', 'do_zone': 'Times Sq/Theatre District', 'pu_borough': 'Queens', 'do_borough': 'Manhattan', 'trip_count': 128000, 'total_revenue': 10240000.0, 'avg_revenue': 80.0, 'avg_distance_miles': 17.5, 'avg_duration_min': 46.2},
    {'pu_location_id': 138, 'do_location_id': 161, 'pu_zone': 'LaGuardia Airport', 'do_zone': 'Midtown Center', 'pu_borough': 'Queens', 'do_borough': 'Manhattan', 'trip_count': 118000, 'total_revenue': 5310000.0, 'avg_revenue': 45.0, 'avg_distance_miles': 9.8, 'avg_duration_min': 31.0},
    {'pu_location_id': 79,  'do_location_id': 148, 'pu_zone': 'East Village', 'do_zone': 'Lower East Side', 'pu_borough': 'Manhattan', 'do_borough': 'Manhattan', 'trip_count': 105000, 'total_revenue': 1155000.0, 'avg_revenue': 11.0, 'avg_distance_miles': 0.9, 'avg_duration_min': 6.5},
    {'pu_location_id': 230, 'do_location_id': 161, 'pu_zone': 'Times Sq/Theatre District', 'do_zone': 'Midtown Center', 'pu_borough': 'Manhattan', 'do_borough': 'Manhattan', 'trip_count': 98000, 'total_revenue': 1274000.0, 'avg_revenue': 13.0, 'avg_distance_miles': 1.2, 'avg_duration_min': 9.8},
  ]
  with open(PUBLIC_DATA_DIR / "top_routes.json", "w") as f:
    json.dump(top_routes, f, indent=2)

  # 12. Airport Analysis
  airport_analysis = [
    {'airport': 'JFK Airport', 'total_trips': 2450000, 'total_revenue': 171500000.0, 'avg_fare': 70.0, 'avg_tip': 13.65, 'avg_tip_rate_pct': 19.5, 'avg_distance_miles': 16.8, 'avg_duration_min': 44.2, 'peak_hour': 18, 'peak_day': 'Sunday'},
    {'airport': 'LaGuardia (LGA)', 'total_trips': 3120000, 'total_revenue': 132600000.0, 'avg_fare': 42.5, 'avg_tip': 7.73, 'avg_tip_rate_pct': 18.2, 'avg_distance_miles': 9.4, 'avg_duration_min': 28.6, 'peak_hour': 19, 'peak_day': 'Thursday'},
    {'airport': 'Newark (EWR)', 'total_trips': 380000, 'total_revenue': 28400000.0, 'avg_fare': 74.7, 'avg_tip': 12.7, 'avg_tip_rate_pct': 17.0, 'avg_distance_miles': 18.2, 'avg_duration_min': 48.1, 'peak_hour': 17, 'peak_day': 'Friday'},
  ]
  with open(PUBLIC_DATA_DIR / "airport_analysis.json", "w") as f:
    json.dump(airport_analysis, f, indent=2)

  # 13. Speed Congestion
  speed_congestion = []
  for b in ['Manhattan', 'Brooklyn', 'Queens', 'Bronx']:
    base_spd = 8.5 if b == 'Manhattan' else (14.2 if b == 'Brooklyn' else 16.5)
    for h in range(24):
      dip = 3.5 if 8 <= h <= 18 and b == 'Manhattan' else 1.0
      speed_congestion.append({
        'borough': b,
        'pickup_hour': h,
        'trip_count': 120000,
        'avg_speed_mph': round(base_spd - dip + (h * 0.2 if h < 6 else 0), 1),
        'avg_duration_min': round(18.5 + dip * 2, 1),
        'avg_distance_miles': 3.2
      })
  with open(PUBLIC_DATA_DIR / "speed_congestion.json", "w") as f:
    json.dump(speed_congestion, f, indent=2)

  # 14. Payment Tipping
  payment_tipping = [
    {'payment_type_id': 1, 'payment_type_name': 'Credit Card', 'trip_count': 30648226, 'total_revenue': 724800000.0, 'avg_fare': 23.6, 'avg_tip': 4.15, 'avg_tip_rate_pct': 17.5, 'pct_trips_with_tip': 88.4},
    {'payment_type_id': 2, 'payment_type_name': 'Cash', 'trip_count': 7100000, 'total_revenue': 142000000.0, 'avg_fare': 20.0, 'avg_tip': 0.0, 'avg_tip_rate_pct': 0.0, 'pct_trips_with_tip': 0.0},
    {'payment_type_id': 3, 'payment_type_name': 'No Charge', 'trip_count': 320000, 'total_revenue': 3840000.0, 'avg_fare': 12.0, 'avg_tip': 0.0, 'avg_tip_rate_pct': 0.0, 'pct_trips_with_tip': 0.0},
    {'payment_type_id': 4, 'payment_type_name': 'Dispute', 'trip_count': 240000, 'total_revenue': 2880000.0, 'avg_fare': 12.0, 'avg_tip': 0.0, 'avg_tip_rate_pct': 0.0, 'pct_trips_with_tip': 0.0},
  ]
  with open(PUBLIC_DATA_DIR / "payment_tipping.json", "w") as f:
    json.dump(payment_tipping, f, indent=2)

  # 15. Surcharges & Taxes
  surcharges_taxes = [
    {'pickup_month': m, 'total_trips': 3200000, 'total_congestion_surcharge': round(3200000 * 2.4, 2), 'total_airport_fee': round(3200000 * 0.4, 2), 'total_mta_tax': round(3200000 * 0.5, 2), 'total_tolls': round(3200000 * 0.8, 2), 'total_revenue': round(3200000 * 23.5, 2)}
    for m in range(1, 13)
  ]
  with open(PUBLIC_DATA_DIR / "surcharges_taxes.json", "w") as f:
    json.dump(surcharges_taxes, f, indent=2)

  # 16. Transit Equity
  transit_equity = [
    {'borough': 'Manhattan', 'total_trips': 32100000, 'outer_borough_trip_share_pct': 0.0, 'avg_fare': 19.5, 'avg_distance_miles': 2.8, 'avg_revenue_per_km': 4.25, 'active_pickup_zones': 68},
    {'borough': 'Queens', 'total_trips': 3400000, 'outer_borough_trip_share_pct': 100.0, 'avg_fare': 38.2, 'avg_distance_miles': 8.9, 'avg_revenue_per_km': 2.65, 'active_pickup_zones': 56},
    {'borough': 'Brooklyn', 'total_trips': 2100000, 'outer_borough_trip_share_pct': 100.0, 'avg_fare': 26.4, 'avg_distance_miles': 5.2, 'avg_revenue_per_km': 3.15, 'active_pickup_zones': 61},
    {'borough': 'Bronx', 'total_trips': 600000, 'outer_borough_trip_share_pct': 100.0, 'avg_fare': 24.1, 'avg_distance_miles': 4.8, 'avg_revenue_per_km': 3.10, 'active_pickup_zones': 42},
    {'borough': 'Staten Island', 'total_trips': 110000, 'outer_borough_trip_share_pct': 100.0, 'avg_fare': 31.0, 'avg_distance_miles': 7.5, 'avg_revenue_per_km': 2.55, 'active_pickup_zones': 18},
  ]
  with open(PUBLIC_DATA_DIR / "transit_equity.json", "w") as f:
    json.dump(transit_equity, f, indent=2)

  # 17. Multi-Year Trends (2019-2023)
  multi_year_trends = [
    {'year': 2019, 'total_trips': 84000000, 'total_revenue': 1386000000.0, 'avg_fare': 16.50, 'avg_tip_pct': 15.2, 'avg_distance_miles': 2.9, 'midtown_8am_rush_trips': 1840000},
    {'year': 2020, 'total_trips': 24800000, 'total_revenue': 446400000.0, 'avg_fare': 18.00, 'avg_tip_pct': 14.8, 'avg_distance_miles': 3.1, 'midtown_8am_rush_trips': 420000},
    {'year': 2021, 'total_trips': 30900000, 'total_revenue': 602550000.0, 'avg_fare': 19.50, 'avg_tip_pct': 16.0, 'avg_distance_miles': 3.2, 'midtown_8am_rush_trips': 610000},
    {'year': 2022, 'total_trips': 35200000, 'total_revenue': 756800000.0, 'avg_fare': 21.50, 'avg_tip_pct': 16.5, 'avg_distance_miles': 3.3, 'midtown_8am_rush_trips': 780000},
    {'year': 2023, 'total_trips': 38310226, 'total_revenue': 881135000.0, 'avg_fare': 23.00, 'avg_tip_pct': 16.8, 'avg_distance_miles': 3.4, 'midtown_8am_rush_trips': 840000},
  ]
  with open(PUBLIC_DATA_DIR / "multi_year_trends.json", "w") as f:
    json.dump(multi_year_trends, f, indent=2)

  # 18. Executive Simulation
  executive_simulation = [
    {'borough': 'Manhattan', 'trip_count': 32100000, 'current_revenue': 625950000.0, 'avg_current_fare': 19.5, 'avg_distance_miles': 2.8, 'avg_duration_min': 14.2, 'pct_congestion_zone_trips': 84.5},
    {'borough': 'Queens', 'trip_count': 3400000, 'current_revenue': 129880000.0, 'avg_current_fare': 38.2, 'avg_distance_miles': 8.9, 'avg_duration_min': 28.5, 'pct_congestion_zone_trips': 42.0},
    {'borough': 'Brooklyn', 'trip_count': 2100000, 'current_revenue': 55440000.0, 'avg_current_fare': 26.4, 'avg_distance_miles': 5.2, 'avg_duration_min': 21.0, 'pct_congestion_zone_trips': 38.5},
    {'borough': 'Bronx', 'trip_count': 600000, 'current_revenue': 14460000.0, 'avg_current_fare': 24.1, 'avg_distance_miles': 4.8, 'avg_duration_min': 19.4, 'pct_congestion_zone_trips': 12.0},
    {'borough': 'Staten Island', 'trip_count': 110000, 'current_revenue': 3410000.0, 'avg_current_fare': 31.0, 'avg_distance_miles': 7.5, 'avg_duration_min': 24.0, 'pct_congestion_zone_trips': 5.0},
  ]
  with open(PUBLIC_DATA_DIR / "executive_simulation.json", "w") as f:
    json.dump(executive_simulation, f, indent=2)

  # 19. Neighborhood Growth
  neighborhood_growth = [
    {'location_id': 255, 'zone': 'Williamsburg (North Side)', 'borough': 'Brooklyn', 'trip_count_2023': 850000, 'revenue_2023': 18700000.0, 'avg_fare_2023': 22.0, 'avg_distance_miles': 4.1, 'growth_rate_pct': 185.4},
    {'location_id': 145, 'zone': 'Long Island City', 'borough': 'Queens', 'trip_count_2023': 920000, 'revenue_2023': 22080000.0, 'avg_fare_2023': 24.0, 'avg_distance_miles': 4.5, 'growth_rate_pct': 162.0},
    {'location_id': 80,  'zone': 'DUMBO/Vinegar Hill', 'borough': 'Brooklyn', 'trip_count_2023': 640000, 'revenue_2023': 15360000.0, 'avg_fare_2023': 24.0, 'avg_distance_miles': 4.2, 'growth_rate_pct': 145.2},
    {'location_id': 37,  'zone': 'Bushwick South', 'borough': 'Brooklyn', 'trip_count_2023': 510000, 'revenue_2023': 11220000.0, 'avg_fare_2023': 22.0, 'avg_distance_miles': 4.8, 'growth_rate_pct': 138.6},
  ]
  with open(PUBLIC_DATA_DIR / "neighborhood_growth.json", "w") as f:
    json.dump(neighborhood_growth, f, indent=2)

  # 20. Weather Impact
  weather_impact = [
    {'weather_condition': 'Clear', 'total_trips': 28400000, 'total_revenue': 610600000.0, 'avg_fare': 21.5, 'avg_tip_pct': 16.5, 'avg_distance_miles': 3.1, 'avg_duration_min': 15.2},
    {'weather_condition': 'Light Rain', 'total_trips': 4500000, 'total_revenue': 108000000.0, 'avg_fare': 24.0, 'avg_tip_pct': 18.2, 'avg_distance_miles': 3.3, 'avg_duration_min': 17.5},
    {'weather_condition': 'Heavy Rain', 'total_trips': 3200000, 'total_revenue': 85760000.0, 'avg_fare': 26.8, 'avg_tip_pct': 19.8, 'avg_distance_miles': 3.5, 'avg_duration_min': 21.4},
    {'weather_condition': 'Snow/Rain', 'total_trips': 2200000, 'total_revenue': 63800000.0, 'avg_fare': 29.0, 'avg_tip_pct': 21.5, 'avg_distance_miles': 3.8, 'avg_duration_min': 24.8},
  ]
  with open(PUBLIC_DATA_DIR / "weather_impact.json", "w") as f:
    json.dump(weather_impact, f, indent=2)

  # 21. Weather Surge Trap (Idea 1)
  weather_surge_trap = [
    {
      'corridor_name': 'Manhattan Inner Loop (Short Hops)',
      'weather_condition': 'Clear',
      'trip_count': 18500000,
      'avg_gross_fare': 15.2,
      'avg_duration_min': 11.5,
      'avg_distance_miles': 1.8,
      'est_deadhead_min': 2.0,
      'effective_hourly_revenue': 67.55,
      'avg_revenue_per_km': 5.25,
      'avg_tip_pct': 17.2,
      'recommendation': 'Tối ưu nhận cuốc liên hoàn ngắn'
    },
    {
      'corridor_name': 'Manhattan Inner Loop (Short Hops)',
      'weather_condition': 'Heavy Rain',
      'trip_count': 2450000,
      'avg_gross_fare': 19.8,
      'avg_duration_min': 18.2,
      'avg_distance_miles': 1.8,
      'est_deadhead_min': 3.0,
      'effective_hourly_revenue': 56.04,
      'avg_revenue_per_km': 6.83,
      'avg_tip_pct': 20.4,
      'recommendation': 'Chiến lược vàng: Doanh thu thực tế cao nhất khi mưa bão'
    },
    {
      'corridor_name': 'LaGuardia Airport Run (LGA)',
      'weather_condition': 'Clear',
      'trip_count': 2100000,
      'avg_gross_fare': 42.5,
      'avg_duration_min': 28.5,
      'avg_distance_miles': 9.4,
      'est_deadhead_min': 20.0,
      'effective_hourly_revenue': 52.58,
      'avg_revenue_per_km': 2.81,
      'avg_tip_pct': 18.2,
      'recommendation': 'Hành lang sinh lời ổn định'
    },
    {
      'corridor_name': 'LaGuardia Airport Run (LGA)',
      'weather_condition': 'Heavy Rain',
      'trip_count': 320000,
      'avg_gross_fare': 54.0,
      'avg_duration_min': 48.0,
      'avg_distance_miles': 9.4,
      'est_deadhead_min': 35.0,
      'effective_hourly_revenue': 39.04,
      'avg_revenue_per_km': 3.57,
      'avg_tip_pct': 21.0,
      'recommendation': 'Giảm 25.7% $/h do kẹt xe cầu Grand Central Pkwy'
    },
    {
      'corridor_name': 'JFK Airport Flat-Rate',
      'weather_condition': 'Clear',
      'trip_count': 1650000,
      'avg_gross_fare': 70.0,
      'avg_duration_min': 45.0,
      'avg_distance_miles': 16.8,
      'est_deadhead_min': 35.0,
      'effective_hourly_revenue': 52.50,
      'avg_revenue_per_km': 2.59,
      'avg_tip_pct': 19.5,
      'recommendation': 'Cần ghép chuyến khứ hồi tại sân bay'
    },
    {
      'corridor_name': 'JFK Airport Flat-Rate',
      'weather_condition': 'Heavy Rain',
      'trip_count': 250000,
      'avg_gross_fare': 82.0,
      'avg_duration_min': 75.0,
      'avg_distance_miles': 16.8,
      'est_deadhead_min': 55.0,
      'effective_hourly_revenue': 37.85,
      'avg_revenue_per_km': 3.03,
      'avg_tip_pct': 22.5,
      'recommendation': 'BẪY DOANH THU: Cước cao nhưng $/h rớt 28% vì Van Wyck kẹt cứng'
    },
    {
      'corridor_name': 'Manhattan to Outer-Borough (Residential)',
      'weather_condition': 'Clear',
      'trip_count': 3400000,
      'avg_gross_fare': 32.0,
      'avg_duration_min': 26.0,
      'avg_distance_miles': 6.8,
      'est_deadhead_min': 28.0,
      'effective_hourly_revenue': 35.56,
      'avg_revenue_per_km': 2.92,
      'avg_tip_pct': 15.4,
      'recommendation': 'Rủi ro chạy rỗng vì ngoại ô dùng 95% Uber/Lyft'
    },
    {
      'corridor_name': 'Manhattan to Outer-Borough (Residential)',
      'weather_condition': 'Heavy Rain',
      'trip_count': 480000,
      'avg_gross_fare': 39.5,
      'avg_duration_min': 46.0,
      'avg_distance_miles': 6.8,
      'est_deadhead_min': 45.0,
      'effective_hourly_revenue': 26.04,
      'avg_revenue_per_km': 3.61,
      'avg_tip_pct': 17.8,
      'recommendation': 'BẪY NGUY HIỂM: Deadhead 100% về trung tâm mất 45p kẹt xe'
    }
  ]
  with open(PUBLIC_DATA_DIR / "weather_surge_trap.json", "w") as f:
    json.dump(weather_surge_trap, f, indent=2)

  # 22. Tipping Weather Segments (Idea 2)
  tipping_weather_segments = [
    {
      'customer_segment': 'Financial & Executive Hub',
      'time_window': 'Morning Rush (7-10h)',
      'weather_condition': 'Clear',
      'trip_count': 3100000,
      'avg_fare': 22.5,
      'avg_tip_amount': 4.50,
      'avg_tip_pct': 20.0,
      'pct_trips_with_tip': 91.2,
      'sensitivity_label': 'Hào phóng & Độ co giãn cao',
      'suggested_smart_tip_pct': 20.0
    },
    {
      'customer_segment': 'Financial & Executive Hub',
      'time_window': 'Morning Rush (7-10h)',
      'weather_condition': 'Heavy Rain',
      'trip_count': 620000,
      'avg_fare': 28.0,
      'avg_tip_amount': 6.86,
      'avg_tip_pct': 24.5,
      'pct_trips_with_tip': 95.8,
      'sensitivity_label': 'Siêu nhạy cảm dịch vụ (Tip Spike +4.5%)',
      'suggested_smart_tip_pct': 25.0
    },
    {
      'customer_segment': 'Financial & Executive Hub',
      'time_window': 'Evening Rush (17-20h)',
      'weather_condition': 'Heavy Rain',
      'trip_count': 780000,
      'avg_fare': 31.5,
      'avg_tip_amount': 7.62,
      'avg_tip_pct': 24.2,
      'pct_trips_with_tip': 94.5,
      'sensitivity_label': 'Sẵn sàng chi trả cao để về nhà nhanh',
      'suggested_smart_tip_pct': 25.0
    },
    {
      'customer_segment': 'Nightlife & Dining District',
      'time_window': 'Nightlife Hours (21-02h)',
      'weather_condition': 'Clear',
      'trip_count': 2850000,
      'avg_fare': 19.5,
      'avg_tip_amount': 3.70,
      'avg_tip_pct': 19.0,
      'pct_trips_with_tip': 88.0,
      'sensitivity_label': 'Hào phóng ổn định',
      'suggested_smart_tip_pct': 20.0
    },
    {
      'customer_segment': 'Nightlife & Dining District',
      'time_window': 'Nightlife Hours (21-02h)',
      'weather_condition': 'Heavy Rain',
      'trip_count': 490000,
      'avg_fare': 25.0,
      'avg_tip_amount': 5.65,
      'avg_tip_pct': 22.6,
      'pct_trips_with_tip': 93.2,
      'sensitivity_label': 'Tăng mạnh vào đêm mưa cuối tuần',
      'suggested_smart_tip_pct': 22.0
    },
    {
      'customer_segment': 'Airport & Interstate Travelers',
      'time_window': 'Midday & Off-Peak',
      'weather_condition': 'Clear',
      'trip_count': 1950000,
      'avg_fare': 58.0,
      'avg_tip_amount': 11.02,
      'avg_tip_pct': 19.0,
      'pct_trips_with_tip': 89.4,
      'sensitivity_label': 'Tip cước lớn cố định',
      'suggested_smart_tip_pct': 18.0
    },
    {
      'customer_segment': 'Airport & Interstate Travelers',
      'time_window': 'Midday & Off-Peak',
      'weather_condition': 'Heavy Rain',
      'trip_count': 310000,
      'avg_fare': 74.0,
      'avg_tip_amount': 16.28,
      'avg_tip_pct': 22.0,
      'pct_trips_with_tip': 93.0,
      'sensitivity_label': 'Độ hào phóng cao khi hỗ trợ hành lý trong mưa',
      'suggested_smart_tip_pct': 22.0
    },
    {
      'customer_segment': 'Residential & Outer Boroughs',
      'time_window': 'Midday & Off-Peak',
      'weather_condition': 'Clear',
      'trip_count': 1420000,
      'avg_fare': 24.0,
      'avg_tip_amount': 3.36,
      'avg_tip_pct': 14.0,
      'pct_trips_with_tip': 74.2,
      'sensitivity_label': 'Nhạy cảm giá (Price Sensitive)',
      'suggested_smart_tip_pct': 15.0
    },
    {
      'customer_segment': 'Residential & Outer Boroughs',
      'time_window': 'Midday & Off-Peak',
      'weather_condition': 'Heavy Rain',
      'trip_count': 220000,
      'avg_fare': 29.5,
      'avg_tip_amount': 4.72,
      'avg_tip_pct': 16.0,
      'pct_trips_with_tip': 80.5,
      'sensitivity_label': 'Tăng nhẹ nhưng vẫn thấp hơn nội đô',
      'suggested_smart_tip_pct': 18.0
    }
  ]
  with open(PUBLIC_DATA_DIR / "tipping_weather_segments.json", "w") as f:
    json.dump(tipping_weather_segments, f, indent=2)

  # 23. Transit Hub Bottleneck (Idea 3)
  transit_hub_bottleneck = [
    {
      'hub_name': 'Penn Station / Moynihan Hub',
      'weather_condition': 'Clear',
      'trip_count_rush_hour': 18500,
      'demand_spike_multiplier': 1.0,
      'avg_speed_mph': 5.8,
      'avg_duration_min': 14.5,
      'nearby_supply_lag_min': 8.5,
      'unmet_demand_estimate_pct': 12.0,
      'dispatch_action': 'Cân bằng tự nhiên'
    },
    {
      'hub_name': 'Penn Station / Moynihan Hub',
      'weather_condition': 'Heavy Rain',
      'trip_count_rush_hour': 42500,
      'demand_spike_multiplier': 2.30,
      'avg_speed_mph': 3.4,
      'avg_duration_min': 28.2,
      'nearby_supply_lag_min': 26.5,
      'unmet_demand_estimate_pct': 44.5,
      'dispatch_action': 'KÍCH HOẠT RADAR DISPATCH: Điều hướng xe từ 1.5km trước 20 phút'
    },
    {
      'hub_name': 'Grand Central Terminal',
      'weather_condition': 'Clear',
      'trip_count_rush_hour': 16200,
      'demand_spike_multiplier': 1.0,
      'avg_speed_mph': 5.5,
      'avg_duration_min': 15.0,
      'nearby_supply_lag_min': 9.0,
      'unmet_demand_estimate_pct': 10.5,
      'dispatch_action': 'Cân bằng tự nhiên'
    },
    {
      'hub_name': 'Grand Central Terminal',
      'weather_condition': 'Heavy Rain',
      'trip_count_rush_hour': 38900,
      'demand_spike_multiplier': 2.40,
      'avg_speed_mph': 3.2,
      'avg_duration_min': 31.0,
      'nearby_supply_lag_min': 29.0,
      'unmet_demand_estimate_pct': 48.0,
      'dispatch_action': 'KÍCH HOẠT RADAR DISPATCH: Tắc nghẽn 42nd St, cần đón đầu từ Park Ave'
    },
    {
      'hub_name': 'Port Authority Bus Terminal',
      'weather_condition': 'Clear',
      'trip_count_rush_hour': 12400,
      'demand_spike_multiplier': 1.0,
      'avg_speed_mph': 4.8,
      'avg_duration_min': 16.2,
      'nearby_supply_lag_min': 11.0,
      'unmet_demand_estimate_pct': 14.0,
      'dispatch_action': 'Cân bằng tự nhiên'
    },
    {
      'hub_name': 'Port Authority Bus Terminal',
      'weather_condition': 'Heavy Rain',
      'trip_count_rush_hour': 27800,
      'demand_spike_multiplier': 2.24,
      'avg_speed_mph': 3.0,
      'avg_duration_min': 34.5,
      'nearby_supply_lag_min': 32.0,
      'unmet_demand_estimate_pct': 52.0,
      'dispatch_action': 'KÍCH HOẠT RADAR DISPATCH: 8th Ave tê liệt, điều hướng xe từ 9th Ave'
    },
    {
      'hub_name': 'Atlantic Terminal (Brooklyn)',
      'weather_condition': 'Clear',
      'trip_count_rush_hour': 4200,
      'demand_spike_multiplier': 1.0,
      'avg_speed_mph': 11.2,
      'avg_duration_min': 12.0,
      'nearby_supply_lag_min': 6.0,
      'unmet_demand_estimate_pct': 8.0,
      'dispatch_action': 'Cân bằng tự nhiên'
    },
    {
      'hub_name': 'Atlantic Terminal (Brooklyn)',
      'weather_condition': 'Heavy Rain',
      'trip_count_rush_hour': 9800,
      'demand_spike_multiplier': 2.33,
      'avg_speed_mph': 7.5,
      'avg_duration_min': 19.5,
      'nearby_supply_lag_min': 16.0,
      'unmet_demand_estimate_pct': 36.0,
      'dispatch_action': 'KÍCH HOẠT RADAR DISPATCH: Tăng cường xe từ Downtown Brooklyn'
    }
  ]
  with open(PUBLIC_DATA_DIR / "transit_hub_bottleneck.json", "w") as f:
    json.dump(transit_hub_bottleneck, f, indent=2)

  # 24. Transit Disruption Spillover (Idea 1)
  transit_disruption_spillover = [
    {
      'hub_name': 'Penn Station (34th St)',
      'disruption_event': 'A/C/E & 1/2/3 Track Flooding',
      'subway_lines_affected': 'A, C, E, 1, 2, 3',
      'passenger_spillover_volume': 28500,
      'baseline_taxi_pickups': 4800,
      'surge_taxi_pickups': 11200,
      'spillover_ratio': 2.33,
      'unmet_demand_pct': 60.7,
      'virtual_hub_capacity': 6500,
      'evacuation_time_min_standard': 45.0,
      'evacuation_time_min_batching': 16.5,
      'efficiency_gain_pct': 63.3,
      'recommended_virtual_hubs': [
        'Moynihan Train Hall Plaza (33rd St)',
        'Penn Plaza South Bay (31st St)'
      ]
    },
    {
      'hub_name': 'Grand Central Terminal',
      'disruption_event': 'Flushing Line (7) & Lexington (4/5/6) Signal Delays',
      'subway_lines_affected': '4, 5, 6, 7, S',
      'passenger_spillover_volume': 24000,
      'baseline_taxi_pickups': 4200,
      'surge_taxi_pickups': 10500,
      'spillover_ratio': 2.50,
      'unmet_demand_pct': 56.2,
      'virtual_hub_capacity': 5800,
      'evacuation_time_min_standard': 42.0,
      'evacuation_time_min_batching': 15.0,
      'efficiency_gain_pct': 64.3,
      'recommended_virtual_hubs': [
        'Vanderbilt Ave Pedestrian Plaza',
        'Pershing Square South (41st St)'
      ]
    },
    {
      'hub_name': 'Union Square & Canal St Hubs',
      'disruption_event': 'Broadway Line (N/Q/R/W) Pump Failure',
      'subway_lines_affected': 'L, N, Q, R, W, 4, 5, 6',
      'passenger_spillover_volume': 19500,
      'baseline_taxi_pickups': 3100,
      'surge_taxi_pickups': 7600,
      'spillover_ratio': 2.45,
      'unmet_demand_pct': 61.0,
      'virtual_hub_capacity': 4200,
      'evacuation_time_min_standard': 38.0,
      'evacuation_time_min_batching': 13.5,
      'efficiency_gain_pct': 64.5,
      'recommended_virtual_hubs': [
        '14th St Transit Mall East',
        'Union Sq West Staging Bay'
      ]
    },
    {
      'hub_name': 'Atlantic Ave / Barclays Center',
      'disruption_event': 'LIRR Terminal Stalling & B/Q Power Cut',
      'subway_lines_affected': 'B, D, N, Q, R, 2, 3, 4, 5, LIRR',
      'passenger_spillover_volume': 16000,
      'baseline_taxi_pickups': 1800,
      'surge_taxi_pickups': 4900,
      'spillover_ratio': 2.72,
      'unmet_demand_pct': 69.4,
      'virtual_hub_capacity': 3500,
      'evacuation_time_min_standard': 35.0,
      'evacuation_time_min_batching': 12.0,
      'efficiency_gain_pct': 65.7,
      'recommended_virtual_hubs': [
        'Barclays Plaza Flatbush Loop',
        'Atlantic Terminal Mall Loading Bay'
      ]
    }
  ]
  with open(PUBLIC_DATA_DIR / "transit_disruption_spillover.json", "w") as f:
    json.dump(transit_disruption_spillover, f, indent=2)

  # 25. Surge Elasticity Curve (Idea 2)
  surge_elasticity_curve = [
    {
      'surge_multiplier': 1.0,
      'customer_conversion_rate_pct': 92.5,
      'driver_supply_count': 3200,
      'completed_trips': 14800,
      'avg_fare_paid': 21.50,
      'total_gmv': 318200.0,
      'platform_revenue': 63640.0,
      'customer_abandonment_pct': 7.5,
      'driver_idle_time_min': 12.5,
      'market_state': 'Cung Cầu Bình Thường'
    },
    {
      'surge_multiplier': 1.2,
      'customer_conversion_rate_pct': 88.0,
      'driver_supply_count': 3800,
      'completed_trips': 16200,
      'avg_fare_paid': 25.80,
      'total_gmv': 417960.0,
      'platform_revenue': 83592.0,
      'customer_abandonment_pct': 12.0,
      'driver_idle_time_min': 9.2,
      'market_state': 'Thanh Khoản Tốt'
    },
    {
      'surge_multiplier': 1.4,
      'customer_conversion_rate_pct': 82.5,
      'driver_supply_count': 4400,
      'completed_trips': 17800,
      'avg_fare_paid': 30.10,
      'total_gmv': 535780.0,
      'platform_revenue': 107156.0,
      'customer_abandonment_pct': 17.5,
      'driver_idle_time_min': 6.8,
      'market_state': 'Thanh Khoản Tăng Trưởng'
    },
    {
      'surge_multiplier': 1.6,
      'customer_conversion_rate_pct': 76.0,
      'driver_supply_count': 4900,
      'completed_trips': 18900,
      'avg_fare_paid': 34.40,
      'total_gmv': 650160.0,
      'platform_revenue': 130032.0,
      'customer_abandonment_pct': 24.0,
      'driver_idle_time_min': 5.2,
      'market_state': 'Tiệm Cận Điểm Tối Ưu'
    },
    {
      'surge_multiplier': 1.8,
      'customer_conversion_rate_pct': 69.5,
      'driver_supply_count': 5300,
      'completed_trips': 19200,
      'avg_fare_paid': 38.70,
      'total_gmv': 743040.0,
      'platform_revenue': 148608.0,
      'customer_abandonment_pct': 30.5,
      'driver_idle_time_min': 4.5,
      'market_state': 'ĐIỂM VÀNG GMV (Sweet Spot S*)'
    },
    {
      'surge_multiplier': 2.0,
      'customer_conversion_rate_pct': 52.0,
      'driver_supply_count': 5600,
      'completed_trips': 15600,
      'avg_fare_paid': 43.00,
      'total_gmv': 670800.0,
      'platform_revenue': 134160.0,
      'customer_abandonment_pct': 48.0,
      'driver_idle_time_min': 8.5,
      'market_state': 'ĐIỂM GÃY CẦU (Khách Bắt Đầu Bỏ App)'
    },
    {
      'surge_multiplier': 2.2,
      'customer_conversion_rate_pct': 38.5,
      'driver_supply_count': 5800,
      'completed_trips': 12100,
      'avg_fare_paid': 47.30,
      'total_gmv': 572330.0,
      'platform_revenue': 114466.0,
      'customer_abandonment_pct': 61.5,
      'driver_idle_time_min': 14.0,
      'market_state': 'Sụt Giảm GMV Nhanh'
    },
    {
      'surge_multiplier': 2.5,
      'customer_conversion_rate_pct': 24.0,
      'driver_supply_count': 6100,
      'completed_trips': 8200,
      'avg_fare_paid': 53.75,
      'total_gmv': 440750.0,
      'platform_revenue': 88150.0,
      'customer_abandonment_pct': 76.0,
      'driver_idle_time_min': 22.5,
      'market_state': 'BẪY SURGE ẢO (Tài Xế Đến Nhưng Không Có Khách)'
    },
    {
      'surge_multiplier': 3.0,
      'customer_conversion_rate_pct': 11.5,
      'driver_supply_count': 6400,
      'completed_trips': 4100,
      'avg_fare_paid': 64.50,
      'total_gmv': 264450.0,
      'platform_revenue': 52890.0,
      'customer_abandonment_pct': 88.5,
      'driver_idle_time_min': 38.0,
      'market_state': 'TÊ LIỆT THANH KHOẢN (Liquidity Deadlock)'
    }
  ]
  with open(PUBLIC_DATA_DIR / "surge_elasticity_curve.json", "w") as f:
    json.dump(surge_elasticity_curve, f, indent=2)

  # 26. Boundary Zone Starvation (Idea 3)
  boundary_zone_starvation = [
    {
      'boundary_zone': 'Long Island City (LIC)',
      'core_borough': 'Manhattan (Midtown East)',
      'outer_borough': 'Queens',
      'corridor_crossing': 'Queensboro Bridge / Midtown Tunnel',
      'normal_wait_min': 4.2,
      'rain_wait_min': 28.5,
      'wait_time_multiplier': 6.79,
      'rejection_rate_pct': 58.4,
      'starvation_index': 3.96,
      'inbound_trips': 14500,
      'outbound_trips': 3200,
      'fleet_deficit_pct': 77.9,
      'buffer_incentive_payout': 4.50,
      'recovery_eta_min': 8.5,
      'recommendation': 'Ưu tiên cuốc hồi Manhattan + Thưởng $4.50/cuốc sang LIC'
    },
    {
      'boundary_zone': 'Williamsburg (North/South)',
      'core_borough': 'Manhattan (Lower East Side / East Village)',
      'outer_borough': 'Brooklyn',
      'corridor_crossing': 'Williamsburg Bridge',
      'normal_wait_min': 3.8,
      'rain_wait_min': 26.0,
      'wait_time_multiplier': 6.84,
      'rejection_rate_pct': 54.2,
      'starvation_index': 3.71,
      'inbound_trips': 16200,
      'outbound_trips': 4100,
      'fleet_deficit_pct': 74.7,
      'buffer_incentive_payout': 4.00,
      'recovery_eta_min': 7.8,
      'recommendation': 'Xếp lốt ưu tiên đón khách quay về Manhattan tại Bedford Ave'
    },
    {
      'boundary_zone': 'Greenpoint',
      'core_borough': 'Manhattan (Midtown / East Side)',
      'outer_borough': 'Brooklyn / Queens border',
      'corridor_crossing': 'Pulaski Bridge / Queens-Midtown',
      'normal_wait_min': 5.5,
      'rain_wait_min': 32.0,
      'wait_time_multiplier': 5.82,
      'rejection_rate_pct': 64.0,
      'starvation_index': 3.72,
      'inbound_trips': 7800,
      'outbound_trips': 1400,
      'fleet_deficit_pct': 82.1,
      'buffer_incentive_payout': 5.00,
      'recovery_eta_min': 9.2,
      'recommendation': 'Tích hợp bộ đệm liên vùng Greenpoint - LIC gom chuyến'
    },
    {
      'boundary_zone': 'Mott Haven (South Bronx)',
      'core_borough': 'Manhattan (Upper Manhattan / Harlem)',
      'outer_borough': 'Bronx',
      'corridor_crossing': '3rd Ave Bridge / Willis Ave Bridge',
      'normal_wait_min': 6.2,
      'rain_wait_min': 36.5,
      'wait_time_multiplier': 5.89,
      'rejection_rate_pct': 71.5,
      'starvation_index': 4.21,
      'inbound_trips': 5200,
      'outbound_trips': 950,
      'fleet_deficit_pct': 81.7,
      'buffer_incentive_payout': 5.50,
      'recovery_eta_min': 10.5,
      'recommendation': 'Gấp đôi điểm thưởng tài xế (2x Points) cứu trợ vùng ranh giới Bronx'
    }
  ]
  with open(PUBLIC_DATA_DIR / "boundary_zone_starvation.json", "w") as f:
    json.dump(boundary_zone_starvation, f, indent=2)

  print("[OK] Sample JSON files created successfully in web/public/data/")

if __name__ == "__main__":
  generate_sample_data()
