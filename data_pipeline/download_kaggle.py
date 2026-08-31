"""
download_kaggle.py — Master Dataset Downloader for Kaggle

Downloads NYC TLC Parquet datasets for Yellow Taxi, Green Taxi, and High-Volume FHV (Uber/Lyft)
consistently across 2023 and 2019 (pre-COVID baseline).

Usage in Kaggle notebook:
    !python download_kaggle.py --year 2023 --modes yellow green fhvhv
"""

import argparse
import os
import urllib.request
from pathlib import Path

BASE_URL = "https://d37ci6vzurychx.cloudfront.net/trip-data"
ZONE_URL = "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv"
WEATHER_URL = "https://raw.githubusercontent.com/pomagrenate/The-City-Is-a-Machine/main/data_pipeline/nyc_weather_2023.csv"


def download_datasets(dest_dir: Path, years: list[int], modes: list[str], months: list[int]):
    dest_dir.mkdir(parents=True, exist_ok=True)

    # 1. Download Zone Lookup CSV
    zone_path = dest_dir / "taxi_zone_lookup.csv"
    if not zone_path.exists():
        print("↓ Downloading taxi_zone_lookup.csv...")
        urllib.request.urlretrieve(ZONE_URL, zone_path)
        print("✓ Saved taxi_zone_lookup.csv")

    # 2. Download Weather Dataset CSV
    weather_path = dest_dir / "nyc_weather_2023.csv"
    if not weather_path.exists():
        print("↓ Downloading real NOAA nyc_weather_2023.csv...")
        try:
            urllib.request.urlretrieve(WEATHER_URL, weather_path)
            print("✓ Saved real NOAA nyc_weather_2023.csv")
        except Exception as e:
            print(f"  ⚠ Could not fetch remote weather CSV: {e}")

    # 2. Download Parquet Trip Data
    for yr in years:
        for mode in modes:
            prefix = "yellow" if mode == "yellow" else ("green" if mode == "green" else "fhvhv")
            for m in months:
                filename = f"{prefix}_tripdata_{yr}-{m:02d}.parquet"
                url = f"{BASE_URL}/{filename}"
                dest = dest_dir / filename

                if dest.exists():
                    print(f"✓ Already exists: {filename}")
                    continue

                print(f"↓ Downloading [{yr}] [{prefix.upper()}] Month {m:02d} ({filename})...")
                try:
                    urllib.request.urlretrieve(url, dest)
                    size_mb = dest.stat().st_size / (1024 * 1024)
                    print(f"  ✓ Saved {filename} ({size_mb:.1f} MB)")
                except Exception as e:
                    print(f"  ✗ Failed to download {filename}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Master NYC TLC Data Downloader for Kaggle")
    parser.add_argument("--dest-dir", type=str, default="/kaggle/working/raw_data", help="Output directory")
    parser.add_argument("--years", type=int, nargs="+", default=[2023, 2019], help="Years to download (default: 2023 2019)")
    parser.add_argument("--modes", type=str, nargs="+", default=["yellow", "green", "fhvhv"], help="Modes: yellow green fhvhv")
    parser.add_argument("--months", type=int, nargs="+", default=list(range(1, 13)), help="Months 1..12")

    args = parser.parse_args()
    dest_dir = Path(args.dest_dir)

    print("=" * 65)
    print("  NYC TLC MASTER DATASET DOWNLOADER")
    print("=" * 65)
    print(f"  Destination: {dest_dir}")
    print(f"  Years:       {args.years}")
    print(f"  Modes:       {args.modes}")
    print(f"  Months:      {args.months}")
    print("=" * 65)

    download_datasets(dest_dir, args.years, args.modes, args.months)

    print()
    print("✓ All requested datasets downloaded!")


if __name__ == "__main__":
    main()
