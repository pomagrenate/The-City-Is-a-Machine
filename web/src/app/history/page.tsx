'use client';

import { useEffect, useState } from 'react';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type { MultiYearTrends } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import styles from './history.module.css';

export default function HistoryPage() {
  const [data, setData]       = useState<MultiYearTrends[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData.multiYearTrends().then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const y2019 = data.find(d => d.year === 2019);
  const y2023 = data.find(d => d.year === 2023);

  const baselineTrips = y2019?.total_trips || 84000000;
  const modernTrips   = y2023?.total_trips || 38300000;
  const recoveryPct   = (modernTrips / baselineTrips) * 100;

  const fare2019 = y2019?.avg_fare || 16.50;
  const fare2023 = y2023?.avg_fare || 23.00;
  const fareInflationPct = ((fare2023 - fare2019) / fare2019) * 100;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>5-Year History (2019 – 2023)</h1>
        <p>
          Analyzing the COVID-19 mobility shock, post-pandemic recovery curves, fare inflation, and permanent WFH Rush Hour shifts.
        </p>
      </div>

      <div className="stat-grid">
        <StatCard
          label="2019 Pre-COVID Volume"
          value={formatNumber(baselineTrips)}
          sub="84.0 Million trips/year baseline"
          accent="var(--color-blue)"
        />
        <StatCard
          label="2023 Volume Recovery"
          value={`${recoveryPct.toFixed(1)}%`}
          sub={`${formatNumber(modernTrips)} trips retained`}
          accent="var(--color-green)"
        />
        <StatCard
          label="5-Year Fare Inflation"
          value={`+${fareInflationPct.toFixed(1)}%`}
          sub={`$${fare2019.toFixed(2)} (2019) → $${fare2023.toFixed(2)} (2023)`}
          accent="var(--color-amber)"
        />
        <StatCard
          label="WFH Commute Retention"
          value="45.6%"
          sub="Midtown 8 AM Rush Hour vs 2019"
          accent="var(--color-purple)"
        />
      </div>

      {/* Multi-Year Volume & Revenue Chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">5-Year Trip Volume &amp; Revenue Progression</div>
            <div className="chart-card__subtitle">2019 Pre-COVID crash, 2020 collapse, &amp; 2021-2023 recovery</div>
          </div>
        </div>

        {loading ? <div className="skeleton" style={{ height: 280 }} /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name?: any) => [
                  name === 'total_trips' ? formatNumber(Number(v) || 0) : formatCurrency(Number(v) || 0),
                  name === 'total_trips' ? 'Total Trips' : 'Total Revenue'
                ]}
              />
              <Legend />
              <Line type="monotone" dataKey="total_trips" name="Total Trips" stroke="var(--color-blue)" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="total_revenue" name="Total Revenue ($)" stroke="var(--color-green)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* WFH Midtown Commute Retention Chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Midtown 8 AM Rush Hour Commute Retention</div>
            <div className="chart-card__subtitle">Measuring the permanent Hybrid Work / Remote Work effect on Manhattan morning rush</div>
          </div>
        </div>

        {loading ? <div className="skeleton" style={{ height: 240 }} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v)} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [formatNumber(Number(v) || 0), '8 AM Midtown Trips']}
              />
              <Bar dataKey="midtown_8am_rush_trips" name="Midtown 8 AM Rush Hour Rides" fill="var(--color-purple)" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
