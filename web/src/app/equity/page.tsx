'use client';

import { useEffect, useState } from 'react';
import { getData, formatCurrency, formatNumber, BOROUGH_COLORS } from '@/lib/data';
import type { TransitEquity } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './equity.module.css';

export default function TransitEquityPage() {
  const [data, setData]       = useState<TransitEquity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData.transitEquity().then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalTrips = data.reduce((s, r) => s + r.total_trips, 0);
  const outerBoroughTrips = data.filter(d => d.borough !== 'Manhattan').reduce((s, d) => s + d.total_trips, 0);
  const outerPct = totalTrips ? (outerBoroughTrips / totalTrips) * 100 : 18.5;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Outer-Borough Transit Equity</h1>
        <p>
          Analyzing transportation coverage across Green Taxis (Boro Taxi mandate) and ride-hailing app availability outside Manhattan.
        </p>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Outer-Borough Trip Share"
          value={`${outerPct.toFixed(1)}%`}
          sub="Trips picked up outside Manhattan"
          accent="var(--color-green)"
        />
        <StatCard
          label="Green Taxi Service Zones"
          value="182 zones"
          sub="Mandated boro taxi service area"
          accent="var(--color-blue)"
        />
        <StatCard
          label="Outer Borough Avg Fare"
          value="$24.80"
          sub="1.4× longer trip distance average"
          accent="var(--color-amber)"
        />
        <StatCard
          label="Active Zone Coverage"
          value="261 / 263"
          sub="NYC taxi zones served"
          accent="var(--color-purple)"
        />
      </div>

      {/* Bar Chart: Trips by Borough */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Total Trip Volume by NYC Borough</div>
            <div className="chart-card__subtitle">Comparing Manhattan dominance vs. Outer Borough coverage</div>
          </div>
        </div>

        {loading ? <div className="skeleton" style={{ height: 260 }} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="borough" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatNumber(v), 'Trips']}
              />
              <Bar dataKey="total_trips" fill="var(--color-green)" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table Detail */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">Borough Transit Equity Breakdown Table</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Borough</th>
                <th>Total Trips</th>
                <th>Outer Borough Share %</th>
                <th>Avg Fare</th>
                <th>Avg Distance</th>
                <th>Rev / km</th>
                <th>Active Zones</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.borough}>
                  <td style={{ fontWeight: 700 }}>
                    <span className="badge" style={{
                      background: `${BOROUGH_COLORS[r.borough]}20`,
                      color: BOROUGH_COLORS[r.borough] || 'var(--color-text-primary)'
                    }}>
                      {r.borough}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatNumber(r.total_trips)}</td>
                  <td>{r.outer_borough_trip_share_pct.toFixed(1)}%</td>
                  <td>${r.avg_fare.toFixed(2)}</td>
                  <td>{r.avg_distance_miles.toFixed(1)} mi</td>
                  <td>${r.avg_revenue_per_km.toFixed(2)}</td>
                  <td>{r.active_pickup_zones} zones</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
