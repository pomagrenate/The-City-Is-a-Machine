'use client';

import { useEffect, useState } from 'react';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type { ExecutiveSimulation } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './executive.module.css';

export default function ExecutivePage() {
  const [data, setData]       = useState<ExecutiveSimulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive Sensitivity Sliders
  const [congestionToll, setCongestionToll] = useState(2.50); // $0 to $15
  const [platformTake, setPlatformTake]     = useState(25);   // 15% to 35%
  const [evSavingsPerMile, setEvSavings]    = useState(0.12); // $0 to $0.35/mi

  useEffect(() => {
    getData.executiveSimulation().then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalTrips   = data.reduce((s, r) => s + r.trip_count, 0) || 38300000;
  const baseRevenue  = data.reduce((s, r) => s + r.current_revenue, 0) || 881000000;
  const totalMiles   = data.reduce((s, r) => s + (r.trip_count * r.avg_distance_miles), 0) || 130000000;

  // Dynamic Financial Modeling Calculations
  const congestionImpactTotal = totalTrips * (congestionToll - 2.50);
  const platformRevenueTotal  = baseRevenue * (platformTake / 100);
  const netDriverPayoutTotal   = baseRevenue - platformRevenueTotal - (totalTrips * congestionToll);
  const evTotalFuelSavings    = totalMiles * evSavingsPerMile;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>CEO Command Center &amp; Investor Sensitivity Engine</h1>
        <p>
          Simulate MTA Congestion Toll policy impacts, platform commission take-rates, and EV fleet transition fuel savings in real-time.
        </p>
      </div>

      {/* Interactive Controls Panel */}
      <div className="chart-card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', marginBottom: 24 }}>
        <div className="chart-card__header">
          <div className="chart-card__title">Interactive CEO Scenario Sliders</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, paddingTop: 10 }}>
          {/* Slider 1: Congestion Toll */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              MTA Congestion Toll: <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>${congestionToll.toFixed(2)}</span> / trip
            </label>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={congestionToll}
              onChange={e => setCongestionToll(parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: 8 }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Baseline: $2.50 below 60th St</div>
          </div>

          {/* Slider 2: Platform Take-Rate */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Platform Take-Rate: <span style={{ color: 'var(--color-blue)', fontWeight: 700 }}>{platformTake}%</span>
            </label>
            <input
              type="range"
              min="15"
              max="35"
              step="1"
              value={platformTake}
              onChange={e => setPlatformTake(parseInt(e.target.value, 10))}
              style={{ width: '100%', marginTop: 8 }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Uber/Lyft Commission Rate</div>
          </div>

          {/* Slider 3: EV Savings */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              EV Fuel Savings: <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>${evSavingsPerMile.toFixed(2)}</span> / mile
            </label>
            <input
              type="range"
              min="0"
              max="0.35"
              step="0.01"
              value={evSavingsPerMile}
              onChange={e => setEvSavings(parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: 8 }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Electric vs Gasoline Savings</div>
          </div>
        </div>
      </div>

      {/* Model Outputs */}
      <div className="stat-grid">
        <StatCard
          label="MTA Congestion Toll Revenue"
          value={formatCurrency(congestionToll * totalTrips)}
          sub={`${congestionImpactTotal >= 0 ? '+' : ''}${formatCurrency(congestionImpactTotal)} vs baseline`}
          accent="var(--color-amber)"
        />
        <StatCard
          label="Platform Net Revenue"
          value={formatCurrency(platformRevenueTotal)}
          sub={`${platformTake}% take-rate on gross receipts`}
          accent="var(--color-blue)"
        />
        <StatCard
          label="Net Driver Payout"
          value={formatCurrency(netDriverPayoutTotal)}
          sub="Driver earnings after tolls & commission"
          accent="var(--color-purple)"
        />
        <StatCard
          label="Annual EV Fuel Savings"
          value={formatCurrency(evTotalFuelSavings)}
          sub="Zero-emission fleet transition ROI"
          accent="var(--color-green)"
        />
      </div>

      {/* Borough Toll vs Net Earnings Chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Borough Gross Revenue vs Simulated Net Payout</div>
            <div className="chart-card__subtitle">Showing financial distribution across NYC boroughs under current slider settings</div>
          </div>
        </div>

        {loading ? <div className="skeleton" style={{ height: 280 }} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.map(r => ({
                borough: r.borough,
                Gross: r.current_revenue,
                NetPayout: r.current_revenue * (1 - platformTake/100) - (r.trip_count * congestionToll)
              }))}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <XAxis dataKey="borough" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Amount']}
              />
              <Legend />
              <Bar dataKey="Gross" name="Gross Passenger Receipts" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="NetPayout" name="Net Driver Payout" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
