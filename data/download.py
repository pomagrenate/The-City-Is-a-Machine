"""
download.py — NYC TLC Yellow Taxi 2023 Data Downloader

Downloads monthly Parquet files from the NYC TLC public dataset
hosted on AWS S3 (no authentication required).

Usage:
    python data/download.py
    python data/download.py --year 2023 --months 1 2 3
    python data/download.py --year 2022 --all
"""

import argparse
import os
import sys
import time
from pathlib import Path

import requests
from tqdm import tqdm

# ── Configuration ────────────────────────────────────────────────────────────

BASE_URL = "https://d37ci6vzurychx.cloudfront.net/trip-data"
# Alternatively: https://nyc-tlc.s3.amazonaws.com/trip+data/ (legacy)

RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Zone lookup file
ZONE_LOOKUP_URL = "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv"
ZONE_SHAPEFILE_URL = "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip"

DEFAULT_YEAR = 2023
DEFAULT_MONTHS = list(range(1, 13))  # Jan–Dec


# ── Download helpers ─────────────────────────────────────────────────────────

def download_file(url: str, dest: Path, skip_if_exists: bool = True) -> bool:
    """Download a file with progress bar. Returns True if downloaded."""
    if skip_if_exists and dest.exists():
        size_mb = dest.stat().st_size / (1024 ** 2)
        print(f"  ✓ Already exists: {dest.name} ({size_mb:.1f} MB)")
        return False

    print(f"  ↓ Downloading: {url}")
    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        total = int(response.headers.get("content-length", 0))
        with open(dest, "wb") as f, tqdm(
            total=total,
            unit="B",
            unit_scale=True,
            unit_divisor=1024,
            desc=dest.name,
            ncols=80,
        ) as bar:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                bar.update(len(chunk))

        size_mb = dest.stat().st_size / (1024 ** 2)
        print(f"  ✓ Saved: {dest.name} ({size_mb:.1f} MB)")
        return True

    except requests.HTTPError as e:
        print(f"  ✗ HTTP error for {url}: {e}")
        if dest.exists():
            dest.unlink()  # Remove partial download
        return False
    except Exception as e:
        print(f"  ✗ Failed to download {url}: {e}")
        if dest.exists():
            dest.unlink()
        return False


def download_yellow_taxi(year: int, month: int) -> Path | None:
    """Download one month of Yellow Taxi data."""
    filename = f"yellow_tripdata_{year}-{month:02d}.parquet"
    url = f"{BASE_URL}/{filename}"
    dest = RAW_DIR / filename
    success = download_file(url, dest)
    return dest if (success or dest.exists()) else None


def download_zone_lookup() -> Path:
    """Download taxi zone lookup CSV."""
    dest = Path(__file__).parent / "taxi_zone_lookup.csv"
    download_file(ZONE_LOOKUP_URL, dest)
    return dest


def download_zone_shapefile() -> Path:
    """Download taxi zone GeoJSON/shapefile for map rendering."""
    dest = Path(__file__).parent / "taxi_zones.zip"
    download_file(ZONE_SHAPEFILE_URL, dest)
    return dest


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Download NYC TLC Yellow Taxi Parquet data"
    )
    parser.add_argument(
        "--year", type=int, default=DEFAULT_YEAR,
        help=f"Year to download (default: {DEFAULT_YEAR})"
    )
    parser.add_argument(
        "--months", type=int, nargs="+", default=DEFAULT_MONTHS,
        help="Months to download (default: 1–12)"
    )
    parser.add_argument(
        "--skip-existing", action="store_true", default=True,
        help="Skip files that already exist (default: True)"
    )
    parser.add_argument(
        "--zone-only", action="store_true",
        help="Only download zone lookup files, skip trip data"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  THE CITY IS A MACHINE — Data Downloader")
    print("=" * 60)
    print(f"  Year:   {args.year}")
    print(f"  Months: {args.months}")
    print(f"  Output: {RAW_DIR}")
    print()

    # Always download zone reference files
    print("── Zone Reference Files ────────────────────────────────")
    download_zone_lookup()
    download_zone_shapefile()
    print()

    if args.zone_only:
        print("✓ Zone-only mode. Done.")
        return

    # Download trip data
    print("── Trip Data ───────────────────────────────────────────")
    downloaded = []
    failed = []

    for month in args.months:
        print(f"\n  Month {month:02d}/{args.year}:")
        result = download_yellow_taxi(args.year, month)
        if result:
            downloaded.append(result)
        else:
            failed.append(month)
        time.sleep(0.5)  # Be polite to the server

    # Summary
    print()
    print("=" * 60)
    print("  DOWNLOAD SUMMARY")
    print("=" * 60)

    total_size = sum(f.stat().st_size for f in RAW_DIR.glob("*.parquet")) / (1024 ** 3)
    print(f"  Files available: {len(list(RAW_DIR.glob('*.parquet')))}")
    print(f"  Total size: {total_size:.2f} GB")

    if failed:
        print(f"  ✗ Failed months: {failed}")
        print("    Re-run the script to retry failed downloads.")
    else:
        print("  ✓ All months downloaded successfully.")
        print()
        print("  Next step:")
        print("    python pipeline/01_bronze.py")

    print("=" * 60)


if __name__ == "__main__":
    main()
