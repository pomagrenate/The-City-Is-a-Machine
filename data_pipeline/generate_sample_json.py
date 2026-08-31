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

  print("[OK] Sample JSON files created successfully in web/public/data/")

if __name__ == "__main__":
  generate_sample_data()
