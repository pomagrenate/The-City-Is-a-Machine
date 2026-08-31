'use client';

import { useEffect, useState } from 'react';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type { UnitEconomics } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import styles from './economics.module.css';

const CATEGORY_COLORS = {
  short:  'var(--color-blue)',
  medium: 'var(--color-amber)',
  long:   'var(--color-green)',
};

const CATEGORY_LABELS = {
  short:  'Short (<2 mi)',
  medium: 'Medium (2–10 mi)',
  long:   'Long (>10 mi)',
};

export default function EconomicsPage() {
  const [data, setData]     = useState<UnitEconomics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData.unitEconomics().then(d => { setData(d); setLoading(false); });
  }, []);

  const short  = data.find(d => d.trip_category === 'short');
  const medium = data.find(d => d.trip_category === 'medium');
  const long   = data.find(d => d.trip_category === 'long');

  const comparison = [
    { metric: 'Avg Revenue', short: short?.avg_revenue ?? 0, medium: medium?.avg_revenue ?? 0, long: long?.avg_revenue ?? 0 },
    { metric: 'Rev / km',    short: short?.avg_revenue_per_km ?? 0, medium: medium?.avg_revenue_per_km ?? 0, long: long?.avg_revenue_per_km ?? 0 },
    { metric: 'Rev / min',   short: short?.avg_revenue_per_min ?? 0, medium: medium?.avg_revenue_per_min ?? 0, long: long?.avg_revenue_per_min ?? 0 },
    { metric: 'Tip Rate %',  short: short?.avg_tip_rate_pct ?? 0, medium: medium?.avg_tip_rate_pct ?? 0, long: long?.avg_tip_rate_pct ?? 0 },
  ];

  const radarData = [
    { subject: 'Revenue/Trip', A: short?.avg_revenue ?? 0,     B: medium?.avg_revenue ?? 0,     C: long?.avg_revenue ?? 0 },
    { subject: 'Rev/km',       A: short?.avg_revenue_per_km ?? 0, B: medium?.avg_revenue_per_km ?? 0, C: long?.avg_revenue_per_km ?? 0 },
    { subject: 'Rev/min',      A: (short?.avg_revenue_per_min ?? 0) * 10,  B: (medium?.avg_revenue_per_min ?? 0) * 10, C: (long?.avg_revenue_per_min ?? 0) * 10 },
    { subject: 'Tip Rate',     A: short?.avg_tip_rate_pct ?? 0, B: medium?.avg_tip_rate_pct ?? 0, C: long?.avg_tip_rate_pct ?? 0 },
    { subject: 'Trip Volume',  A: (short?.trip_count ?? 0) / 100000, B: (medium?.trip_count ?? 0) / 100000, C: (long?.trip_count ?? 0) / 100000 },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Unit Economics</h1>
        <p>
          Are short city hops or long airport runs actually more profitable?
          Revenue per km is the real measure of efficiency.
        </p>
      </div>

      <div className="stat-grid">
        <StatCard label="Short Trips Rev/km" value={`$${short?.avg_revenue_per_km?.toFixed(2) ?? '—'}`}
          sub={`${formatNumber(short?.trip_count ?? 0)} trips`} accent="var(--color-blue)" />
        <StatCard label="Medium Trips Rev/km" value={`$${medium?.avg_revenue_per_km?.toFixed(2) ?? '—'}`}
          sub={`${formatNumber(medium?.trip_count ?? 0)} trips`} accent="var(--color-amber)" />
        <StatCard label="Long Trips Rev/km" value={`$${long?.avg_revenue_per_km?.toFixed(2) ?? '—'}`}
          sub={`${formatNumber(long?.trip_count ?? 0)} trips`} accent="var(--color-green)" />
        <StatCard label="Short Trip Share"
          value={`${data.length ? ((short?.revenue_share_pct ?? 0)).toFixed(1) : '—'}%`}
          sub="Of total revenue" accent="var(--color-purple)" />
      </div>

      {/* Insight callout */}
      <div className={styles.insight}>
        <div className={styles.insightIcon}>💡</div>
        <div>
          <div className={styles.insightTitle}>The Short Trip Paradox</div>
          <p style={{ margin: 0 }}>
            Short trips (&lt;2 miles) typically generate the <strong>highest revenue per km</strong> —
            the base fare covers most of the cost. Long trips look impressive in total revenue but
            operate at lower efficiency per kilometer. Airport runs (JFK/LGA) are the exception:
            high fare <em>and</em> high efficiency.
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Comparison Bar Chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Revenue / km by Category</div>
              <div className="chart-card__subtitle">The efficiency metric that matters</div>
            </div>
          </div>
          {loading ? <div className="skeleton" style={{ height: 220 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { category: 'Short', value: short?.avg_revenue_per_km ?? 0, color: 'var(--color-blue)' },
                { category: 'Medium', value: medium?.avg_revenue_per_km ?? 0, color: 'var(--color-amber)' },
                { category: 'Long', value: long?.avg_revenue_per_km ?? 0, color: 'var(--color-green)' },
              ]} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fontSize: 13, fill: 'var(--color-text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                       tickFormatter={v => `$${v.toFixed(2)}`} width={50} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${(Number(v) || 0).toFixed(2)}/km`, 'Revenue per km']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive maxBarSize={80}
                     fill="var(--color-blue)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Multi-metric comparison */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Multi-Metric Comparison</div>
              <div className="chart-card__subtitle">Revenue, efficiency, and tip rate</div>
            </div>
          </div>
          <div className={styles.compTable}>
            <div className={styles.compHeader}>
              <div />
              <div style={{ color: CATEGORY_COLORS.short }}>Short</div>
              <div style={{ color: CATEGORY_COLORS.medium }}>Medium</div>
              <div style={{ color: CATEGORY_COLORS.long }}>Long</div>
            </div>
            {[
              { label: 'Avg Revenue', fn: (d?: UnitEconomics) => `$${d?.avg_revenue?.toFixed(2) ?? '—'}` },
              { label: 'Avg Distance', fn: (d?: UnitEconomics) => `${d?.avg_distance_miles?.toFixed(1) ?? '—'} mi` },
              { label: 'Avg Duration', fn: (d?: UnitEconomics) => `${d?.avg_duration_min?.toFixed(1) ?? '—'} min` },
              { label: 'Rev / km', fn: (d?: UnitEconomics) => `$${d?.avg_revenue_per_km?.toFixed(2) ?? '—'}` },
              { label: 'Rev / min', fn: (d?: UnitEconomics) => `$${d?.avg_revenue_per_min?.toFixed(2) ?? '—'}` },
              { label: 'Tip Rate', fn: (d?: UnitEconomics) => `${d?.avg_tip_rate_pct?.toFixed(1) ?? '—'}%` },
              { label: 'Trip Count', fn: (d?: UnitEconomics) => formatNumber(d?.trip_count ?? 0) },
              { label: 'Revenue Share', fn: (d?: UnitEconomics) => `${d?.revenue_share_pct?.toFixed(1) ?? '—'}%` },
            ].map(row => (
              <div key={row.label} className={styles.compRow}>
                <div className={styles.compLabel}>{row.label}</div>
                <div>{row.fn(short)}</div>
                <div>{row.fn(medium)}</div>
                <div>{row.fn(long)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue share bars */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">Revenue Contribution by Category</div>
          <div className="chart-card__subtitle">Share of total 2023 revenue</div>
        </div>
        <div className={styles.shareBars}>
          {data.map(d => (
            <div key={d.trip_category} className={styles.shareRow}>
              <div className={styles.shareLabel}>{CATEGORY_LABELS[d.trip_category] ?? d.trip_category}</div>
              <div className={styles.shareBarWrap}>
                <div className={styles.shareBar}
                  style={{
                    width: `${d.revenue_share_pct}%`,
                    background: CATEGORY_COLORS[d.trip_category] ?? 'var(--color-blue)'
                  }}
                />
              </div>
              <div className={styles.shareValue}>{d.revenue_share_pct.toFixed(1)}%</div>
              <div className={styles.shareAmount}>{formatCurrency(d.total_revenue)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
