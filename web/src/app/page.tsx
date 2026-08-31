'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/ui/StatCard';
import { getData, formatCurrency, formatNumber, MONTH_NAMES, BOROUGH_COLORS } from '@/lib/data';
import type { BoroughSummary, MonthlyTrend, DataSummary } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import styles from './page.module.css';

import Link from 'next/link';
import { FaDollarSign, FaServer, FaSearchLocation } from 'react-icons/fa';

export default function OverviewPage() {
  const [boroughs, setBoroughs]   = useState<BoroughSummary[]>([]);
  const [monthly, setMonthly]     = useState<MonthlyTrend[]>([]);
  const [summary, setSummary]     = useState<DataSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  useEffect(() => {
    Promise.all([
      getData.boroughSummary(),
      getData.monthlyTrends(),
      getData.dataSummary(),
    ]).then(([b, m, s]) => {
      setBoroughs(b);
      setMonthly(m);
      setSummary(s);
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  }, []);

  const totalRevenue = boroughs.reduce((s, b) => s + b.total_revenue, 0);
  const totalTrips   = boroughs.reduce((s, b) => s + b.total_trips, 0);
  const avgRevenue   = totalTrips > 0 ? totalRevenue / totalTrips : 0;

  const monthlyData = monthly.map(m => ({
    ...m,
    month: MONTH_NAMES[m.pickup_month],
    revenue_m: +(m.total_revenue / 1_000_000).toFixed(2),
    trips_k:   +(m.total_trips / 1_000).toFixed(1),
  }));

  if (error) return (
    <div className="page-content">
      <div className="no-data">
        <h3>No data found</h3>
        <p>Place JSON files in <code>web/public/data/</code> after running the Kaggle pipeline.</p>
        <p>See <strong>README_KAGGLE.md</strong> for instructions.</p>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <div className={styles.hero}>
        <div className={styles.heroEyebrow}>5.33 GB Urban Telemetry · 120M+ Multi-Year Trips · NOAA Weather</div>
        <h1 className={styles.heroTitle}>The City Is a Machine</h1>
        <p className={styles.heroSub}>
          120M+ trips across 263 zones. Weather, geography, fares, congestion, and human behavior.
          I wanted to find out how a city moves, makes money, and reacts when things go wrong.
        </p>
        <div className={styles.heroMeta}>
          {summary && (
            <>
              <span>{formatNumber(summary.total_rows_processed)} trips analyzed</span>
              <span>·</span>
              <span>{summary.silver_files} monthly files</span>
              <span>·</span>
              <span>{summary.tables_generated.length} analytical tables</span>
            </>
          )}
        </div>
      </div>

      {/* 3 Door Entry System */}
      <div className={styles.doorsGrid}>
        <Link href="/revenue" className={styles.doorCard}>
          <div className={styles.doorHeader}>
            <span className={styles.doorIcon}><FaDollarSign /></span>
            <span className={styles.doorBadge}>01 — BUSINESS</span>
          </div>
          <div className={styles.doorTitle}>Where is the Money?</div>
          <div className={styles.doorSub}>Explore revenue distributions, fare surge elasticity, airport corridors, and unit economics ($/km).</div>
        </Link>

        <Link href="/technical" className={styles.doorCard}>
          <div className={styles.doorHeader}>
            <span className={styles.doorIcon}><FaServer /></span>
            <span className={styles.doorBadge}>02 — TECHNICAL</span>
          </div>
          <div className={styles.doorTitle}>How Did It Scale?</div>
          <div className={styles.doorSub}>Medallion ETL pipeline architecture (Bronze→Silver→Gold), DuckDB vs Spark benchmark queries, and memory limits.</div>
        </Link>

        <Link href="/equity" className={styles.doorCard}>
          <div className={styles.doorHeader}>
            <span className={styles.doorIcon}><FaSearchLocation /></span>
            <span className={styles.doorBadge}>03 — INVESTIGATE</span>
          </div>
          <div className={styles.doorTitle}>What Did We Discover?</div>
          <div className={styles.doorSub}>Green Taxi outer-borough equity gaps, NOAA rain surge tipping elasticity, and post-COVID WFH rush hour shifts.</div>
        </Link>
      </div>

      {loading ? (
        <div className="stat-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : (
        <div className="stat-grid">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(totalRevenue)}
            sub="All NYC Yellow Taxi 2023"
            accent="var(--color-blue)"
          />
          <StatCard
            label="Total Trips"
            value={formatNumber(totalTrips)}
            sub="Cleaned & validated records"
            accent="var(--color-green)"
          />
          <StatCard
            label="Avg Revenue / Trip"
            value={`$${avgRevenue.toFixed(2)}`}
            sub="Across all zones"
            accent="var(--color-amber)"
          />
          <StatCard
            label="Active Boroughs"
            value={boroughs.length.toString()}
            sub={`${boroughs[0]?.zone_count ?? '—'} zones in top borough`}
            accent="var(--color-purple)"
          />
        </div>
      )}

      {/* Dataset & Volume Inventory */}
      <div className="chart-card" style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Multi-Modal Dataset Inventory &amp; Volume Weights</div>
            <div className="chart-card__subtitle">
              Detailed breakdown of raw data sources, file weights, and analytical focus across 5.33 GB of urban telemetry
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-blue)', textTransform: 'uppercase' }}>Primary Dataset</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0', color: 'var(--color-text-primary)' }}>Yellow Taxi (2019–2023)</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <strong>Data Volume:</strong> ~4.8 GB (110M+ Trips)<br />
              <strong>Focus:</strong> Manhattan Commercial Core, Airport Corridors, Business Hours, Congestion Tariffs.
            </div>
          </div>

          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-green)', textTransform: 'uppercase' }}>Transit Equity</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0', color: 'var(--color-text-primary)' }}>Green Taxi (Boro Taxi)</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <strong>Data Volume:</strong> ~400 MB (10M+ Trips)<br />
              <strong>Focus:</strong> Mandated Outer-Borough Coverage (Bronx, Brooklyn, Queens, Staten Island, Upper Manhattan).
            </div>
          </div>

          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-purple)', textTransform: 'uppercase' }}>Environmental Telemetry</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0', color: 'var(--color-text-primary)' }}>NOAA NYC Weather (2023)</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <strong>Data Volume:</strong> 365 Daily Records<br />
              <strong>Focus:</strong> Rain &amp; Snowfall Surge Factors, Bad Weather Tip Premiums, Central Park Telemetry.
            </div>
          </div>

          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber)', textTransform: 'uppercase' }}>Spatial &amp; Tariffs</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, margin: '4px 0', color: 'var(--color-text-primary)' }}>MTA Rules &amp; 263 Zones</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <strong>Data Volume:</strong> 263 Spatial Zones<br />
              <strong>Focus:</strong> $2.50 Base Fare, $2.50 Congestion Charge, $0.50 MTA Tax, Airport Surcharges.
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Monthly Revenue Trend */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Monthly Revenue</div>
              <div className="chart-card__subtitle">Total revenue ($M) per month</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                formatter={(v: any) => [`$${v}M`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue_m" stroke="var(--color-blue)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--color-blue)' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Borough Revenue Breakdown */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Revenue by Borough</div>
              <div className="chart-card__subtitle">Total revenue ($M) per borough</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={boroughs.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                     tickFormatter={v => `$${(v/1_000_000).toFixed(0)}M`} />
              <YAxis type="category" dataKey="borough" width={90} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                formatter={(v: any) => [formatCurrency(Number(v) || 0), 'Revenue']}
              />
              <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}
                   fill="var(--color-blue)"
                   isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Borough Summary Table */}
      <div className="chart-card" style={{ marginTop: 4 }}>
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Borough Performance Summary</div>
            <div className="chart-card__subtitle">Key metrics across all NYC boroughs</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Borough</th>
                <th>Total Trips</th>
                <th>Total Revenue</th>
                <th>Avg / Trip</th>
                <th>Rev / km</th>
                <th>Avg Duration</th>
                <th>Tip Rate</th>
                <th>% Peak</th>
              </tr>
            </thead>
            <tbody>
              {boroughs.map(b => (
                <tr key={b.borough}>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      fontWeight: 600, color: 'var(--color-text-primary)'
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        background: BOROUGH_COLORS[b.borough] ?? 'var(--color-border)'
                      }} />
                      {b.borough}
                    </span>
                  </td>
                  <td>{formatNumber(b.total_trips)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(b.total_revenue)}</td>
                  <td>${b.avg_revenue_per_trip.toFixed(2)}</td>
                  <td>${b.avg_revenue_per_km.toFixed(2)}</td>
                  <td>{b.avg_duration_min.toFixed(1)} min</td>
                  <td>{b.avg_tip_rate_pct.toFixed(1)}%</td>
                  <td>{b.pct_peak_trips.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trip Count */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Monthly Trip Volume</div>
            <div className="chart-card__subtitle">Number of trips (thousands) per month</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={42}
                   tickFormatter={v => `${v}K`} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
              formatter={(v: any) => [`${v}K trips`, 'Volume']}
            />
            <Bar dataKey="trips_k" fill="var(--color-green)" radius={[4, 4, 0, 0]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
