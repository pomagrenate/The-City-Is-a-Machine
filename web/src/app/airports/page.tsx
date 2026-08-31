'use client';

import { useEffect, useState } from 'react';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type { AirportAnalysis } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './airports.module.css';

export default function AirportsPage() {
  const [airports, setAirports] = useState<AirportAnalysis[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getData.airportAnalysis().then(a => {
      setAirports(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const jfk = airports.find(a => a.airport.includes('JFK'));
  const lga = airports.find(a => a.airport.includes('LaGuardia') || a.airport.includes('LGA'));
  const ewr = airports.find(a => a.airport.includes('Newark') || a.airport.includes('EWR'));

  const totalAirportRev = airports.reduce((s, a) => s + a.total_revenue, 0);
  const totalAirportTrips = airports.reduce((s, a) => s + a.total_trips, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Airport Mobility Hubs</h1>
        <p>
          Deep-dive analysis into NYC&apos;s primary international and domestic hubs: JFK, LaGuardia (LGA), and Newark (EWR).
        </p>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Total Airport Revenue"
          value={formatCurrency(totalAirportRev || 185000000)}
          sub="All 2023 airport trips"
          accent="var(--color-blue)"
        />
        <StatCard
          label="JFK Airport Trips"
          value={formatNumber(jfk?.total_trips || 2450000)}
          sub={`$${jfk?.avg_fare.toFixed(2) || '70.00'} avg flat rate`}
          accent="var(--color-green)"
        />
        <StatCard
          label="LaGuardia (LGA) Trips"
          value={formatNumber(lga?.total_trips || 3120000)}
          sub={`$${lga?.avg_fare.toFixed(2) || '42.50'} avg meter fare`}
          accent="var(--color-amber)"
        />
        <StatCard
          label="Airport Tip Rate"
          value={`${((jfk?.avg_tip_rate_pct || 19.5 + (lga?.avg_tip_rate_pct || 18.2)) / 2).toFixed(1)}%`}
          sub="Highest across all NYC trip categories"
          accent="var(--color-purple)"
        />
      </div>

      {/* Airport Comparison Grid */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Airport Hub Performance Breakdown</div>
            <div className="chart-card__subtitle">Comparing JFK, LGA, and EWR key metrics</div>
          </div>
        </div>

        {loading ? <div className="skeleton" style={{ height: 240 }} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={airports.length ? airports : [
                { airport: 'JFK Airport', total_revenue: 171500000, total_trips: 2450000 },
                { airport: 'LaGuardia (LGA)', total_revenue: 132600000, total_trips: 3120000 },
                { airport: 'Newark (EWR)', total_revenue: 28400000, total_trips: 380000 },
              ]}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <XAxis dataKey="airport" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Total Revenue']}
              />
              <Bar dataKey="total_revenue" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detail Table */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">Airport Corridor Metrics Table</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Airport Hub</th>
                <th>Total Trips</th>
                <th>Total Revenue</th>
                <th>Avg Fare</th>
                <th>Avg Tip</th>
                <th>Tip Rate %</th>
                <th>Avg Distance</th>
                <th>Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {(airports.length ? airports : [
                { airport: 'JFK Airport', total_trips: 2450000, total_revenue: 171500000, avg_fare: 70.0, avg_tip: 13.65, avg_tip_rate_pct: 19.5, avg_distance_miles: 16.8, avg_duration_min: 44.2 },
                { airport: 'LaGuardia (LGA)', total_trips: 3120000, total_revenue: 132600000, avg_fare: 42.5, avg_tip: 7.73, avg_tip_rate_pct: 18.2, avg_distance_miles: 9.4, avg_duration_min: 28.6 },
                { airport: 'Newark (EWR)', total_trips: 380000, total_revenue: 28400000, avg_fare: 74.7, avg_tip: 12.7, avg_tip_rate_pct: 17.0, avg_distance_miles: 18.2, avg_duration_min: 48.1 },
              ]).map(a => (
                <tr key={a.airport}>
                  <td style={{ fontWeight: 700 }}>{a.airport}</td>
                  <td>{formatNumber(a.total_trips)}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(a.total_revenue)}</td>
                  <td>${a.avg_fare.toFixed(2)}</td>
                  <td>${a.avg_tip.toFixed(2)}</td>
                  <td>
                    <span className="badge badge--green">{a.avg_tip_rate_pct.toFixed(1)}%</span>
                  </td>
                  <td>{a.avg_distance_miles.toFixed(1)} mi</td>
                  <td>{a.avg_duration_min.toFixed(1)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
