'use client';

import { useEffect, useState } from 'react';
import { getData } from '@/lib/data';
import type { BenchmarkResults } from '@/types';
import StatCard from '@/components/ui/StatCard';
import styles from './technical.module.css';

export default function TechnicalPage() {
  const [benchmark, setBenchmark] = useState<BenchmarkResults | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    getData.benchmarkResults()
      .then(b => { setBenchmark(b); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Technical Architecture &amp; Benchmarks</h1>
        <p>
          &quot;Every business question creates a technical problem.&quot; How the Medallion Pipeline handles
          tens of millions of records and at what scale Spark becomes necessary.
        </p>
      </div>

      <div className="stat-grid">
        <StatCard label="Pipeline Strategy" value="Medallion" sub="Bronze → Silver → Gold" accent="var(--color-blue)" />
        <StatCard label="Query Engine" value="DuckDB" sub="In-process OLAP vectorization" accent="var(--color-green)" />
        <StatCard label="Storage Format" value="Parquet" sub="Columnar compression" accent="var(--color-amber)" />
        <StatCard label="Spark Crossover" value={benchmark?.analysis?.crossover_estimate || "50 GB+"} sub="When cluster scaling wins" accent="var(--color-purple)" />
      </div>

      {/* Architecture Diagram */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Data Pipeline Architecture</div>
            <div className="chart-card__subtitle">Kaggle offline processing → Next.js static JSON delivery</div>
          </div>
        </div>

        <div className={styles.pipelineFlow}>
          <div className={styles.flowNode}>
            <div className={styles.flowBadge}>Raw Data</div>
            <div className={styles.flowTitle}>NYC TLC Parquet</div>
            <div className={styles.flowDesc}>AWS S3 public bucket (~3-5 GB compressed)</div>
          </div>

          <div className={styles.flowArrow}>→</div>

          <div className={styles.flowNode}>
            <div className={styles.flowBadge} style={{ background: '#dbeafe', color: '#1e40af' }}>Bronze</div>
            <div className={styles.flowTitle}>Ingestion &amp; Schema</div>
            <div className={styles.flowDesc}>Drops corrupt rows &amp; validates schema types</div>
          </div>

          <div className={styles.flowArrow}>→</div>

          <div className={styles.flowNode}>
            <div className={styles.flowBadge} style={{ background: '#fef3c7', color: '#92400e' }}>Silver</div>
            <div className={styles.flowTitle}>Cleaning &amp; Enrichment</div>
            <div className={styles.flowDesc}>Filters outliers, joins zone maps, derives metrics</div>
          </div>

          <div className={styles.flowArrow}>→</div>

          <div className={styles.flowNode}>
            <div className={styles.flowBadge} style={{ background: '#dcfce7', color: '#166534' }}>Gold</div>
            <div className={styles.flowTitle}>DuckDB Aggregation</div>
            <div className={styles.flowDesc}>Vectorized SQL exports pre-computed JSON</div>
          </div>
        </div>
      </div>

      {/* Benchmark Results */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Benchmark Engine (&quot;How Big Is Actually Big?&quot;)</div>
            <div className="chart-card__subtitle">
              Evaluating Pandas vs. DuckDB vs. PySpark across data volume tiers
            </div>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : benchmark && benchmark.tiers ? (
          <div>
            <div className={styles.benchmarkQuery}>
              <strong>Test Query:</strong> <code>{benchmark.query}</code>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data Tier</th>
                    <th>Size (GB)</th>
                    <th>Pandas Time</th>
                    <th>Pandas RAM</th>
                    <th>DuckDB Time</th>
                    <th>DuckDB RAM</th>
                    <th>PySpark Status</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark.tiers.map((t, idx) => {
                    const pd = t.engines.pandas;
                    const dk = t.engines.duckdb;
                    const sp = t.engines.spark;
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{t.tier}</td>
                        <td>{t.size_gb} GB</td>
                        <td>{pd?.elapsed_sec ? `${pd.elapsed_sec}s` : '—'}</td>
                        <td>{pd?.peak_memory_mb ? `${pd.peak_memory_mb} MB` : '—'}</td>
                        <td style={{ color: 'var(--color-green)', fontWeight: 700 }}>
                          {dk?.elapsed_sec ? `${dk.elapsed_sec}s` : '—'}
                        </td>
                        <td>{dk?.peak_memory_mb ? `${dk.peak_memory_mb} MB` : '—'}</td>
                        <td>
                          {sp?.elapsed_sec ? `${sp.elapsed_sec}s (${sp.peak_memory_mb} MB)` : sp?.notes || sp?.status || 'Skipped'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.analysisBox}>
              <div className={styles.analysisTitle}>Analytical Takeaway</div>
              <p className={styles.analysisText}>
                {benchmark.analysis?.finding ||
                  "DuckDB is significantly faster than Pandas on single-machine workloads with lower memory consumption. Spark's startup overhead (~30s) makes it slower at <10GB scales, but becomes essential when dataset scale exceeds single-machine RAM limits."}
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.fallbackBox}>
            <div className={styles.fallbackTitle}>Default Benchmark Insight</div>
            <p className={styles.fallbackText}>
              <strong>Pandas:</strong> Materializes the full dataset in memory. High RAM footprint, single-threaded execution.<br />
              <strong>DuckDB:</strong> In-process vectorized query execution. ~10x faster execution with fraction of RAM usage.<br />
              <strong>PySpark:</strong> High JVM initialization &amp; shuffle overhead for small datasets (&lt;10 GB). Ideal at 50 GB+ cluster scales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
