# The City Is a Machine

> **Millions of trips. One very large dataset. A lot of questions about where the money goes.**

A portfolio-grade **Urban Mobility Intelligence Platform** built on NYC TLC Taxi Trip data. This project tells two parallel stories simultaneously:

- **Business story:** Where does the city make money? Where is demand? How should we allocate resources?
- **Technical story:** What happens when your dataset is too large for the obvious solution?

---

## Two Entry Points

This project is intentionally designed with **two doors** — choose based on what you care about:

| If you're a... | Start here |
|---|---|
| Head of Product / Business Analyst | [`case_study/business_entry.md`](case_study/business_entry.md) |
| Tech Lead / Data Architect / Senior Engineer | [`case_study/technical_entry.md`](case_study/technical_entry.md) |

---

## Architecture

```
NYC TLC Public S3 (Raw Parquet)
          ↓
    data/raw/              ← Downloaded Parquet files (Jan–Dec 2023)
          ↓
  pipeline/01_bronze.py
          ↓
    data/bronze/           ← Schema-validated, no transformation
          ↓
  pipeline/02_silver.py
          ↓
    data/silver/           ← Cleaned, enriched, derived fields
          ↓
  pipeline/03_gold.py
          ↓
    data/gold/             ← Pre-aggregated business tables
          ↓
  dashboard/app.py         ← Streamlit: 5 tabs, fully interactive
          ↓
  benchmarks/              ← Pandas / DuckDB / PySpark comparison
```

---

## Dataset

**NYC TLC Trip Record Data** — Yellow Taxi, 2023 (Jan–Dec)

- **Source:** NYC Taxi & Limousine Commission ([nyc.gov/tlc](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)) via public AWS S3
- **Format:** Parquet (columnar, compressed)
- **Scale:** ~3–5 GB compressed, ~37 million trips
- **Zone reference:** `data/taxi_zone_lookup.csv` (LocationID → Borough/Zone)

Key fields: `pickup_datetime`, `dropoff_datetime`, `PULocationID`, `DOLocationID`, `trip_distance`, `fare_amount`, `tip_amount`, `total_amount`, `payment_type`

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Data ingestion | Python + requests (no-auth S3) |
| Bronze/Silver pipeline | pandas, pyarrow |
| Gold aggregations | DuckDB (SQL on Parquet) |
| Benchmarking | pandas, duckdb, pyspark + tracemalloc/time/psutil |
| Dashboard | Streamlit + Plotly |
| Storage | Parquet, Medallion structure |

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

> PySpark requires Java 8+. If you don't have it: `winget install Microsoft.OpenJDK.21`

### 2. Download data (~3–5 GB)

```bash
python data/download.py
```

### 3. Run the pipeline

```bash
python pipeline/01_bronze.py
python pipeline/02_silver.py
python pipeline/03_gold.py
```

### 4. Run benchmarks (optional, ~10–20 min)

```bash
python benchmarks/run_benchmarks.py
```

### 5. Launch dashboard

```bash
streamlit run dashboard/app.py
```

---

## Business Questions Answered

- Which NYC zones generate the highest revenue per trip?
- When does demand peak — and does supply keep up?
- What's the revenue efficiency of airport runs vs. short Manhattan hops?
- If we add 500 drivers on Friday 6PM, where should they go?
- At what data scale does distributed computing actually become necessary?

---

## The Benchmark

One of the core claims of this project: **"I used Spark because Big Data"** is not a good reason.

This project runs the same business query (`Revenue per Zone per Hour`) on:
- **Pandas** — the obvious first solution
- **DuckDB** — surprisingly fast single-machine OLAP
- **PySpark** — distributed processing

...and honestly documents when each tool wins and why.

---

## Data Source Attribution

NYC TLC Trip Record data is provided by the **NYC Taxi & Limousine Commission** under the [NYC Open Data Terms of Use](https://opendata.cityofnewyork.us/overview/#termsofuse). Downloaded via AWS Open Data public S3 (`s3://nyc-tlc/`).
