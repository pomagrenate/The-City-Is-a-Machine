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
        <div className={styles.heroEyebrow}>NYC Yellow Taxi · 2023</div>
        <h1 className={styles.heroTitle}>The City Is a Machine</h1>
        <p className={styles.heroSub}>
          Millions of trips happen every day. Where does the money go?
          Where does demand appear? And can we build a system capable
          of answering those questions at scale?
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
                formatter={(v: number) => [`$${v}M`, 'Revenue']}
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
                formatter={(v: number) => [formatCurrency(v), 'Revenue']}
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
              formatter={(v: number) => [`${v}K trips`, 'Volume']}
            />
            <Bar dataKey="trips_k" fill="var(--color-green)" radius={[4, 4, 0, 0]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
