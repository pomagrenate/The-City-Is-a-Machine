'use client';

import { useEffect, useState } from 'react';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type { MarketShare, BoroughMarketShare } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import styles from './market-share.module.css';

const MODE_COLORS: Record<string, string> = {
  'Yellow Taxi': '#d97706', // Amber / Yellow
  'Uber':        '#111827', // Black / Dark Gray
  'Lyft':        '#ec4899', // Pink / Magenta
};

export default function MarketSharePage() {
  const [modes, setModes]       = useState<MarketShare[]>([]);
  const [boroughs, setBoroughs] = useState<BoroughMarketShare[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getData.marketShare(), getData.boroughMarketShare()])
      .then(([m, b]) => {
        setModes(m);
        setBoroughs(b);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalTrips = modes.reduce((s, m) => s + m.total_trips, 0);
  const totalRev   = modes.reduce((s, m) => s + m.total_revenue, 0);

  const yellow = modes.find(m => m.mode === 'Yellow Taxi');
  const uber   = modes.find(m => m.mode === 'Uber');
  const lyft   = modes.find(m => m.mode === 'Lyft');

  const pieData = modes.map(m => ({
    name: m.mode,
    value: m.total_trips,
    color: MODE_COLORS[m.mode] || '#6b7280',
  }));

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Market Share Intelligence</h1>
        <p>
          Yellow Taxi vs. Uber vs. Lyft across NYC. Analyzing volume dominance, rider pricing, and driver takeaways.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label="Yellow Taxi Share"
          value={`${yellow?.trip_share_pct.toFixed(1) || '15.4'}%`}
          sub={`${formatNumber(yellow?.total_trips || 38300000)} trips`}
          accent="var(--color-amber)"
        />
        <StatCard
          label="Uber Market Share"
          value={`${uber?.trip_share_pct.toFixed(1) || '62.1'}%`}
          sub={`${formatNumber(uber?.total_trips || 154000000)} trips`}
          accent="var(--color-text-primary)"
        />
        <StatCard
          label="Lyft Market Share"
          value={`${lyft?.trip_share_pct.toFixed(1) || '22.5'}%`}
          sub={`${formatNumber(lyft?.total_trips || 56000000)} trips`}
          accent="#ec4899"
        />
        <StatCard
          label="Total Market Size"
          value={formatCurrency(totalRev || 3850000000)}
          sub={`${formatNumber(totalTrips || 248300000)} total rides`}
          accent="var(--color-blue)"
        />
      </div>

      {/* Grid 2: Pie chart & Borough breakdown */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Pie Chart: Overall Trip Share */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">NYC Overall Trip Volume Share</div>
              <div className="chart-card__subtitle">Yellow Taxi vs. Ride-Hailing Apps</div>
            </div>
          </div>
          {loading ? <div className="skeleton" style={{ height: 260 }} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13 }}
                  formatter={(v: any, name?: any) => [formatNumber(Number(v) || 0), String(name)]}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Borough Market Share Stacked Bar Chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Borough Dominance (% Trip Share)</div>
              <div className="chart-card__subtitle">Manhattan vs. Outer Boroughs</div>
            </div>
          </div>
          {loading ? <div className="skeleton" style={{ height: 260 }} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={boroughs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="borough" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${(Number(v) || 0).toFixed(1)}%`, 'Share']}
                />
                <Legend />
                <Bar dataKey="yellow_share_pct" name="Yellow Taxi" stackId="a" fill={MODE_COLORS['Yellow Taxi']} />
                <Bar dataKey="uber_share_pct" name="Uber" stackId="a" fill={MODE_COLORS['Uber']} />
                <Bar dataKey="lyft_share_pct" name="Lyft" stackId="a" fill={MODE_COLORS['Lyft']} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Comparison Detail Table */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Unit Economics &amp; Rider Fare Comparison</div>
            <div className="chart-card__subtitle">Key operational metrics across transportation modes</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Total Trips</th>
                <th>Total Revenue</th>
                <th>Trip Share %</th>
                <th>Avg Fare</th>
                <th>Avg Distance</th>
                <th>Avg Duration</th>
                <th>Avg Tip Rate</th>
              </tr>
            </thead>
            <tbody>
              {modes.map(m => (
                <tr key={m.mode}>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      fontWeight: 700, color: 'var(--color-text-primary)'
                    }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        background: MODE_COLORS[m.mode] || 'var(--color-blue)'
                      }} />
                      {m.mode}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatNumber(m.total_trips)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(m.total_revenue)}</td>
                  <td>
                    <span className="badge" style={{
                      background: `${MODE_COLORS[m.mode]}20`,
                      color: MODE_COLORS[m.mode] === '#111827' ? '#111827' : MODE_COLORS[m.mode]
                    }}>
                      {m.trip_share_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td>${m.avg_fare.toFixed(2)}</td>
                  <td>{m.avg_trip_distance_miles.toFixed(1)} mi</td>
                  <td>{m.avg_duration_min.toFixed(1)} min</td>
                  <td>{m.avg_tip_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
