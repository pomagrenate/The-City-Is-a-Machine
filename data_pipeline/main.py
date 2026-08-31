"""
main.py — The City Is a Machine: Data Pipeline Entry Point

Run this on a Kaggle Notebook. It reads NYC TLC Yellow Taxi Parquet files,
runs Bronze → Silver → Gold pipeline, and exports JSON files for the
Next.js dashboard.

Kaggle Dataset to add to your notebook:
  https://www.kaggle.com/datasets/elemento/nyc-yellow-taxi-trip-data
  OR the official NYC TLC Parquet files.

Usage (Kaggle notebook cell):
    !python main.py --data-dir /kaggle/input/nyc-yellow-taxi-trip-data --output-dir /kaggle/working/output

Usage (local):
    python main.py --data-dir ./data/raw --output-dir ./output --months 1 2 3

After running, download ALL files from /kaggle/working/output/
and place them in: web/public/data/
"""

import argparse
import json
import sys
import time
from pathlib import Path

# ── CLI Args ──────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="The City Is a Machine — Data Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Kaggle (full year):
  python main.py --data-dir /kaggle/input/nyc-tlc-data --output-dir /kaggle/working/output

  # Local (3 months only):
  python main.py --data-dir ./data/raw --output-dir ./output --months 1 2 3

  # Skip to gold if silver already exists:
  python main.py --data-dir ./data/raw --output-dir ./output --skip-bronze --skip-silver

  # Include benchmark:
  python main.py --data-dir ./data/raw --output-dir ./output --benchmark
        """,
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="/kaggle/input",
        help="Directory containing raw Parquet files (yellow_tripdata_*.parquet)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="/kaggle/working/output",
        help="Directory to write JSON output files",
    )
    parser.add_argument(
        "--months",
        type=int,
        nargs="+",
        default=None,
        help="Specific months to process (e.g. --months 1 2 3). Default: all found.",
    )
    parser.add_argument(
        "--year",
        type=int,
        default=2023,
        help="Year of data to process (default: 2023)",
    )
    parser.add_argument(
        "--skip-bronze",
        action="store_true",
        help="Skip bronze stage (use existing bronze files)",
    )
    parser.add_argument(
        "--skip-silver",
        action="store_true",
        help="Skip silver stage (use existing silver files)",
    )
    parser.add_argument(
        "--benchmark",
        action="store_true",
        help="Run Pandas vs DuckDB benchmark after pipeline",
    )
    parser.add_argument(
        "--no-spark",
        action="store_true",
        help="Skip PySpark in benchmark (if Java not available)",
    )
    return parser.parse_args()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    data_dir   = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Working dirs for intermediate data
    bronze_dir = output_dir / "bronze"
    silver_dir = output_dir / "silver"
    bronze_dir.mkdir(exist_ok=True)
    silver_dir.mkdir(exist_ok=True)

    print("=" * 65)
    print("  THE CITY IS A MACHINE — Data Pipeline")
    print("=" * 65)
    print(f"  Data dir:   {data_dir}")
    print(f"  Output dir: {output_dir}")
    print(f"  Year:       {args.year}")
    print(f"  Months:     {args.months or 'all found'}")
    print("=" * 65)

    t_global = time.time()

    # ── Import pipeline modules ───────────────────────────────────────────────
    from pipeline.bronze import run_bronze
    from pipeline.silver import run_silver
    from pipeline.gold   import run_gold

    pipeline_stats = {}

    # ── Stage 1: Bronze ───────────────────────────────────────────────────────
    if not args.skip_bronze:
        print("\n[1/3] BRONZE — Schema Validation & Ingestion")
        print("-" * 45)
        bronze_stats = run_bronze(
            data_dir=data_dir,
            bronze_dir=bronze_dir,
            year=args.year,
            months=args.months,
        )
        pipeline_stats["bronze"] = bronze_stats
        print(f"  ✓ Bronze complete: {bronze_stats['total_rows_bronze']:,} rows retained")
    else:
        print("\n[1/3] BRONZE — Skipped (--skip-bronze)")

    # ── Stage 2: Silver ───────────────────────────────────────────────────────
    if not args.skip_silver:
        print("\n[2/3] SILVER — Cleaning, Enrichment & Derived Fields")
        print("-" * 45)
        # Zone lookup: try data_dir first, then output_dir
        zone_lookup_candidates = [
            data_dir / "taxi_zone_lookup.csv",
            output_dir / "taxi_zone_lookup.csv",
            Path(__file__).parent / "taxi_zone_lookup.csv",
        ]
        zone_lookup_path = next((p for p in zone_lookup_candidates if p.exists()), None)
        if zone_lookup_path is None:
            print("  ✗ taxi_zone_lookup.csv not found!")
            print("    Add it to your Kaggle dataset or alongside main.py")
            sys.exit(1)

        silver_stats = run_silver(
            bronze_dir=bronze_dir,
            silver_dir=silver_dir,
            zone_lookup_path=zone_lookup_path,
            year=args.year,
        )
        pipeline_stats["silver"] = silver_stats
        print(f"  ✓ Silver complete: {silver_stats['total_rows_out']:,} rows cleaned")
    else:
        print("\n[2/3] SILVER — Skipped (--skip-silver)")

    # ── Stage 3: Gold → JSON ──────────────────────────────────────────────────
    print("\n[3/3] GOLD — Aggregations → JSON Export")
    print("-" * 45)
    gold_stats = run_gold(
        silver_dir=silver_dir,
        output_dir=output_dir,
    )
    pipeline_stats["gold"] = gold_stats

    # ── Optional: Benchmark ───────────────────────────────────────────────────
    if args.benchmark:
        print("\n[+] BENCHMARK — Pandas vs DuckDB vs PySpark")
        print("-" * 45)
        from pipeline.benchmark import run_benchmark
        run_benchmark(
            silver_dir=silver_dir,
            output_dir=output_dir,
            run_spark=not args.no_spark,
        )

    # ── Write pipeline_stats.json ─────────────────────────────────────────────
    pipeline_stats["total_elapsed_sec"] = round(time.time() - t_global, 2)
    pipeline_stats["year"] = args.year
    pipeline_stats["data_dir"] = str(data_dir)

    stats_path = output_dir / "pipeline_stats.json"
    with open(stats_path, "w") as f:
        json.dump(pipeline_stats, f, indent=2, default=str)

    # ── Final summary ─────────────────────────────────────────────────────────
    total_elapsed = time.time() - t_global
    print()
    print("=" * 65)
    print("  PIPELINE COMPLETE")
    print("=" * 65)
    print(f"  Total elapsed: {total_elapsed:.1f}s")
    print()
    print("  JSON files written to:")
    for f in sorted(output_dir.glob("*.json")):
        size_kb = f.stat().st_size / 1024
        print(f"    {f.name:<35} {size_kb:>8.1f} KB")
    print()
    print("  Next steps:")
    print("    1. Download all JSON files from Kaggle output")
    print("    2. Place them in: web/public/data/")
    print("    3. cd web && npm run dev")
    print("=" * 65)


if __name__ == "__main__":
    main()
