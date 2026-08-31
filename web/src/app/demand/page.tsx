'use client';

import { useEffect, useState, useMemo } from 'react';
import { getData, DAY_NAMES, formatNumber } from '@/lib/data';
import type { DailyHeatmap, HourlyDemand } from '@/types';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './demand.module.css';

// Build full heatmap grid: 7 days × 24 hours
function buildHeatmapGrid(data: DailyHeatmap[]) {
  const grid: Record<string, number> = {};
  let max = 0;
  data.forEach(d => {
    const key = `${d.pickup_dayofweek}-${d.pickup_hour}`;
    grid[key] = d.trip_count;
    if (d.trip_count > max) max = d.trip_count;
  });
  return { grid, max };
}

function heatColor(value: number, max: number): string {
  if (max === 0) return '#f1f3f7';
  const t = value / max;
  // White → light blue → blue → dark blue
  const r = Math.round(255 - t * (255 - 26));
  const g = Math.round(255 - t * (255 - 86));
  const b = Math.round(255 - t * (255 - 219));
  return `rgb(${r},${g},${b})`;
}

export default function DemandPage() {
  const [heatmap, setHeatmap]     = useState<DailyHeatmap[]>([]);
  const [hourly, setHourly]       = useState<HourlyDemand[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getData.dailyHeatmap(), getData.hourlyDemand()]).then(([h, hd]) => {
      setHeatmap(h);
      setHourly(hd);
      setLoading(false);
    });
  }, []);

  const { grid, max } = useMemo(() => buildHeatmapGrid(heatmap), [heatmap]);

  // Aggregate trips by hour (for bar chart, optionally filtered by day)
  const hourlyAgg = useMemo(() => {
    const agg: Record<number, number> = {};
    for (let h = 0; h < 24; h++) agg[h] = 0;
    heatmap.forEach(d => {
      if (selectedDay === null || d.pickup_dayofweek === selectedDay) {
        agg[d.pickup_hour] = (agg[d.pickup_hour] ?? 0) + d.trip_count;
      }
    });
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      trips: agg[h] ?? 0,
      isPeak: (h >= 7 && h < 10) || (h >= 17 && h < 20),
    }));
  }, [heatmap, selectedDay]);

  const peakHour = hourlyAgg.reduce((mx, h) => h.trips > mx.trips ? h : mx, hourlyAgg[0] ?? { hour: '—', trips: 0 });
  const totalTrips = heatmap.reduce((s, d) => s + d.trip_count, 0);
  const peakVsOffPeak = heatmap.filter(d => (d.pickup_hour >= 7 && d.pickup_hour < 10) || (d.pickup_hour >= 17 && d.pickup_hour < 20));
  const peakTrips = peakVsOffPeak.reduce((s, d) => s + d.trip_count, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Demand Intelligence</h1>
        <p>When does the city move? Which hours drive peak demand, and where does supply fall short?</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Total Trips" value={formatNumber(totalTrips)} sub="All 2023" accent="var(--color-blue)" />
        <StatCard label="Peak Hour" value={peakHour.hour} sub={`${formatNumber(peakHour.trips)} trips`} accent="var(--color-amber)" />
        <StatCard label="Peak Trip Share" value={`${totalTrips ? ((peakTrips/totalTrips)*100).toFixed(1) : '—'}%`}
          sub="Morning + evening peaks" accent="var(--color-red)" />
        <StatCard label="Active Zones" value={heatmap.length > 0 ? formatNumber(heatmap.reduce((m, d) => Math.max(m, d.active_zones), 0)) : '—'}
          sub="At peak hour" accent="var(--color-green)" />
      </div>

      {/* Day × Hour Heatmap */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Demand Heatmap — Hour × Day of Week</div>
            <div className="chart-card__subtitle">Trip volume. Darker = more trips. Click a day column to filter the chart below.</div>
          </div>
          {selectedDay !== null && (
            <button className={styles.clearBtn} onClick={() => setSelectedDay(null)}>
              Clear filter ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 180 }} />
        ) : (
          <div className={styles.heatmapWrap}>
            <div className={styles.heatmapHours}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className={styles.hourLabel}>{h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}</div>
              ))}
            </div>
            {DAY_NAMES.map((day, dow) => (
              <div key={dow} className={styles.heatmapRow}>
                <div className={`${styles.dayLabel} ${selectedDay === dow ? styles.dayLabelActive : ''}`}
                  onClick={() => setSelectedDay(selectedDay === dow ? null : dow)}>
                  {day}
                </div>
                {Array.from({ length: 24 }, (_, h) => {
                  const val = grid[`${dow}-${h}`] ?? 0;
                  return (
                    <div key={h} className={styles.heatCell}
                      style={{ background: heatColor(val, max) }}
                      title={`${day} ${h}:00 — ${formatNumber(val)} trips`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hourly Bar Chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">
              Trip Volume by Hour
              {selectedDay !== null && ` — ${DAY_NAMES[selectedDay]}`}
            </div>
            <div className="chart-card__subtitle">
              Blue bars = defined peak hours (7–10am, 5–8pm weekdays)
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={hourlyAgg} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                   interval={2} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                   tickFormatter={v => `${(v/1000).toFixed(0)}K`} width={40} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [formatNumber(v), 'Trips']}
            />
            <Bar dataKey="trips" radius={[3, 3, 0, 0]} isAnimationActive maxBarSize={28}>
              {hourlyAgg.map((entry, i) => (
                <Cell key={i} fill={entry.isPeak ? 'var(--color-blue)' : 'var(--color-border)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
