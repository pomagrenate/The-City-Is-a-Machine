# Running Data Pipeline on Kaggle Notebook

This guide explains how to run the data extraction and processing pipeline on Kaggle to generate the pre-aggregated JSON files for the Next.js website.

---

## Step 1: Create a Kaggle Notebook

1. Go to [Kaggle](https://www.kaggle.com/) and create a new **Notebook**.
2. Attach the **NYC TLC Yellow Taxi dataset** to your notebook:
   - Search for **`NYC TLC Taxi Trip Data`** or add Parquet files from Kaggle Datasets.
3. Set Accelerator: **CPU** (No GPU required).

---

## Step 2: Upload Pipeline Files

Upload the contents of `data_pipeline/` to the Kaggle notebook environment:
- `main.py`
- `pipeline/` (`__init__.py`, `bronze.py`, `silver.py`, `gold.py`, `benchmark.py`)
- `taxi_zone_lookup.csv`

---

## Step 3: Run the Pipeline in a Code Cell

```python
!pip install duckdb pyarrow

!python main.py \
    --data-dir /kaggle/input/nyc-yellow-taxi-trip-data \
    --output-dir /kaggle/working/output \
    --benchmark
```

### Command Line Arguments (`main.py`):
- `--data-dir`: Path to directory containing raw `.parquet` trip files.
- `--output-dir`: Destination path for JSON output files (Default: `/kaggle/working/output`).
- `--months`: Specific months to process (e.g. `--months 1 2 3`). Omit to process all available.
- `--skip-bronze`: Skip raw ingestion if bronze files exist.
- `--skip-silver`: Skip cleaning if silver files exist.
- `--benchmark`: Run Pandas vs DuckDB benchmark performance comparison.
- `--no-spark`: Skip PySpark in benchmark if Java is unavailable.

---

## Step 4: Download JSON Files to Next.js

1. After the pipeline completes, download all generated `.json` files from `/kaggle/working/output/`.
2. Move/copy the `.json` files into your Next.js project directory at:
   ```text
   web/public/data/
   ├── zone_revenue.json
   ├── hourly_demand.json
   ├── borough_summary.json
   ├── monthly_trends.json
   ├── unit_economics.json
   ├── daily_heatmap.json
   ├── simulator_base.json
   ├── benchmark_results.json
   └── data_summary.json
   ```
3. Run the website locally:
   ```bash
   cd web
   npm run dev
   ```
