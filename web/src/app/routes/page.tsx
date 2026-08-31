'use client';

import { useEffect, useState, useMemo } from 'react';
import { getData, formatCurrency, formatNumber, BOROUGH_COLORS } from '@/lib/data';
import type { TopRoute } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './routes.module.css';

const BOROUGHS = ['All', 'Manhattan', 'Queens', 'Brooklyn', 'Bronx'];

export default function RoutesPage() {
  const [routes, setRoutes]   = useState<TopRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [puBorough, setPuBorough] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getData.topRoutes().then(r => {
      setRoutes(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredRoutes = useMemo(() => {
    return routes.filter(r => {
      const matchBorough = puBorough === 'All' || r.pu_borough === puBorough;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        r.pu_zone.toLowerCase().includes(q) ||
        r.do_zone.toLowerCase().includes(q);
      return matchBorough && matchSearch;
    });
  }, [routes, puBorough, searchQuery]);

  const busiestRoute = routes[0];
  const totalCorridorRev = routes.reduce((s, r) => s + r.total_revenue, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Route Corridor Intelligence</h1>
        <p>
          Top origin-destination transit corridors across New York City. Where do people travel most, and which routes generate peak revenue?
        </p>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Busiest Route Corridor"
          value={busiestRoute ? `${busiestRoute.pu_zone} → ${busiestRoute.do_zone}` : '—'}
          sub={`${formatNumber(busiestRoute?.trip_count || 0)} trips`}
          accent="var(--color-blue)"
        />
        <StatCard
          label="Top Corridors Revenue"
          value={formatCurrency(totalCorridorRev)}
          sub={`Across top ${routes.length} routes`}
          accent="var(--color-green)"
        />
        <StatCard
          label="Avg Route Distance"
          value={routes.length ? `${(routes.reduce((s, r) => s + r.avg_distance_miles, 0) / routes.length).toFixed(1)} mi` : '—'}
          sub="Top corridors average"
          accent="var(--color-amber)"
        />
        <StatCard
          label="Avg Route Fare"
          value={routes.length ? `$${(routes.reduce((s, r) => s + r.avg_revenue, 0) / routes.length).toFixed(2)}` : '—'}
          sub="Average per trip"
          accent="var(--color-purple)"
        />
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Pickup Borough</label>
          <div className={styles.tabs}>
            {BOROUGHS.map(b => (
              <button key={b} onClick={() => setPuBorough(b)}
                className={`${styles.tab} ${puBorough === b ? styles.tabActive : ''}`}>{b}</button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup} style={{ flex: 1, maxWidth: 300 }}>
          <label className={styles.filterLabel}>Search Zone</label>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search pickup or dropoff zone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Bar Chart: Top 15 Routes */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Top 15 Route Corridors by Trip Volume</div>
            <div className="chart-card__subtitle">Origin → Destination pair density</div>
          </div>
        </div>
        {loading ? <div className="skeleton" style={{ height: 320 }} /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={filteredRoutes.slice(0, 15).map(r => ({
                corridor: `${r.pu_zone} → ${r.do_zone}`,
                trips: r.trip_count,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 10, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                     tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="corridor" width={220}
                     tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatNumber(v), 'Trips']}
              />
              <Bar dataKey="trips" fill="var(--color-blue)" radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table Detail */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div className="chart-card__title">Route Corridor Performance Table</div>
          <div className="chart-card__subtitle">{filteredRoutes.length} corridors shown</div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 440, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pickup Zone</th>
                <th>Dropoff Zone</th>
                <th>Pickup Borough</th>
                <th>Dropoff Borough</th>
                <th>Trips</th>
                <th>Total Revenue</th>
                <th>Avg Revenue</th>
                <th>Distance</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((r, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{r.pu_zone}</td>
                  <td style={{ fontWeight: 600 }}>{r.do_zone}</td>
                  <td>
                    <span className="badge" style={{
                      background: `${BOROUGH_COLORS[r.pu_borough]}18`,
                      color: BOROUGH_COLORS[r.pu_borough] || 'var(--color-text-secondary)'
                    }}>
                      {r.pu_borough}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: `${BOROUGH_COLORS[r.do_borough]}18`,
                      color: BOROUGH_COLORS[r.do_borough] || 'var(--color-text-secondary)'
                    }}>
                      {r.do_borough}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatNumber(r.trip_count)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(r.total_revenue)}</td>
                  <td>${r.avg_revenue.toFixed(2)}</td>
                  <td>{r.avg_distance_miles.toFixed(1)} mi</td>
                  <td>{r.avg_duration_min.toFixed(1)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
