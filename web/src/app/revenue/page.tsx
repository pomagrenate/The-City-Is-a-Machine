'use client';

import { useEffect, useState, useMemo } from 'react';
import { getData, formatCurrency, formatNumber, BOROUGH_COLORS } from '@/lib/data';
import type { ZoneRevenue } from '@/types';
import StatCard from '@/components/ui/StatCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid,
} from 'recharts';
import styles from './revenue.module.css';

const BOROUGHS = ['All', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

export default function RevenuePage() {
  const [zones, setZones]       = useState<ZoneRevenue[]>([]);
  const [loading, setLoading]   = useState(true);
  const [borough, setBorough]   = useState('All');
  const [sortBy, setSortBy]     = useState<keyof ZoneRevenue>('total_revenue');
  const [topN, setTopN]         = useState(20);

  useEffect(() => {
    getData.zoneRevenue().then(d => { setZones(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let d = borough === 'All' ? zones : zones.filter(z => z.borough === borough);
    return [...d].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number)).slice(0, topN);
  }, [zones, borough, sortBy, topN]);

  const topStats = zones.slice(0, 1)[0];
  const totalRevenue = zones.reduce((s, z) => s + z.total_revenue, 0);
  const avgTip = zones.length ? zones.reduce((s, z) => s + z.avg_tip_rate_pct, 0) / zones.length : 0;

  const efficiencyData = useMemo(() =>
    zones.slice(0, 50).map(z => ({
      zone: z.zone,
      borough: z.borough,
      revenue_per_km: z.avg_revenue_per_km,
      avg_duration: z.avg_trip_duration_min,
      total_trips: z.total_trips,
    })), [zones]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Revenue Intelligence</h1>
        <p>Which zones generate the most revenue? How does revenue efficiency vary by location?</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub="All zones 2023" accent="var(--color-blue)" />
        <StatCard label="Top Zone" value={topStats?.zone ?? '—'} sub={`$${topStats?.avg_revenue_per_trip?.toFixed(2)} avg/trip`} accent="var(--color-green)" />
        <StatCard label="Best Rev/km" value={`$${zones[0]?.avg_revenue_per_km?.toFixed(2) ?? '—'}`} sub="Highest efficiency zone" accent="var(--color-amber)" />
        <StatCard label="Avg Tip Rate" value={`${avgTip.toFixed(1)}%`} sub="All zones average" accent="var(--color-purple)" />
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Borough</label>
          <div className={styles.tabs}>
            {BOROUGHS.map(b => (
              <button key={b} onClick={() => setBorough(b)}
                className={`${styles.tab} ${borough === b ? styles.tabActive : ''}`}>{b}</button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sort by</label>
          <select className={styles.select} value={sortBy}
            onChange={e => setSortBy(e.target.value as keyof ZoneRevenue)}>
            <option value="total_revenue">Total Revenue</option>
            <option value="avg_revenue_per_trip">Avg per Trip</option>
            <option value="avg_revenue_per_km">Revenue / km</option>
            <option value="avg_revenue_per_min">Revenue / min</option>
            <option value="total_trips">Trip Volume</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Show top</label>
          <select className={styles.select} value={topN} onChange={e => setTopN(+e.target.value)}>
            <option value={10}>10 zones</option>
            <option value={20}>20 zones</option>
            <option value={30}>30 zones</option>
          </select>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Top Zones by {sortBy.replace(/_/g,' ')}</div>
            <div className="chart-card__subtitle">
              {borough === 'All' ? 'All boroughs' : borough} · Top {topN} zones
            </div>
          </div>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 340 }} />
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={filtered} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                     tickFormatter={v => sortBy === 'total_revenue' ? `$${(v/1000).toFixed(0)}K`
                                      : sortBy.includes('rate') || sortBy.includes('pct') ? `${v}%` : `$${v.toFixed(2)}`} />
              <YAxis type="category" dataKey="zone" width={140}
                     tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [
                  sortBy === 'total_revenue' ? formatCurrency(Number(v) || 0)
                  : String(sortBy).includes('rate') || String(sortBy).includes('pct') ? `${(Number(v) || 0).toFixed(2)}%`
                  : `$${(Number(v) || 0).toFixed(2)}`,
                  String(sortBy).replace(/_/g, ' ')
                ]}
              />
              <Bar dataKey={sortBy} radius={[0, 4, 4, 0]}
                fill="var(--color-blue)" isAnimationActive maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detail Table */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">Zone Revenue Detail</div>
          <div className="chart-card__subtitle">{filtered.length} zones shown</div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Zone</th>
                <th>Borough</th>
                <th>Trips</th>
                <th>Total Revenue</th>
                <th>Avg/Trip</th>
                <th>Rev/km</th>
                <th>Rev/min</th>
                <th>Avg Duration</th>
                <th>Tip Rate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((z, i) => (
                <tr key={z.location_id}>
                  <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{z.zone}</td>
                  <td>
                    <span className="badge" style={{
                      background: `${BOROUGH_COLORS[z.borough]}18`,
                      color: BOROUGH_COLORS[z.borough] ?? 'var(--color-text-secondary)'
                    }}>{z.borough}</span>
                  </td>
                  <td>{formatNumber(z.total_trips)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(z.total_revenue)}</td>
                  <td>${z.avg_revenue_per_trip.toFixed(2)}</td>
                  <td>${z.avg_revenue_per_km.toFixed(2)}</td>
                  <td>${z.avg_revenue_per_min.toFixed(2)}</td>
                  <td>{z.avg_trip_duration_min.toFixed(1)} min</td>
                  <td>{z.avg_tip_rate_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
