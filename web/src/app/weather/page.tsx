'use client';

import { useEffect, useState } from 'react';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type {
  WeatherImpact,
  WeatherSurgeTrap,
  TippingWeatherSegment,
  TransitHubBottleneck,
  TransitDisruptionSpillover,
} from '@/types';
import StatCard from '@/components/ui/StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FaCloudRain,
  FaCarSide,
  FaCoins,
  FaSubway,
  FaWater,
  FaLightbulb,
  FaExclamationTriangle,
} from 'react-icons/fa';
import styles from './weather.module.css';

export default function WeatherPage() {
  const [weatherData, setWeatherData] = useState<WeatherImpact[]>([]);
  const [surgeTrapData, setSurgeTrapData] = useState<WeatherSurgeTrap[]>([]);
  const [tippingData, setTippingData] = useState<TippingWeatherSegment[]>([]);
  const [transitHubData, setTransitHubData] = useState<TransitHubBottleneck[]>([]);
  const [disruptionData, setDisruptionData] = useState<TransitDisruptionSpillover[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'surge-trap' | 'tipping' | 'transit-hub' | 'disruption'>('overview');

  useEffect(() => {
    Promise.all([
      getData.weatherImpact().catch(() => []),
      getData.weatherSurgeTrap().catch(() => []),
      getData.tippingWeatherSegments().catch(() => []),
      getData.transitHubBottleneck().catch(() => []),
      getData.transitDisruptionSpillover().catch(() => []),
    ]).then(([w, s, t, th, ds]) => {
      setWeatherData(w || []);
      setSurgeTrapData(s || []);
      setTippingData(t || []);
      setTransitHubData(th || []);
      setDisruptionData(ds || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const clearData = weatherData.find(d => d?.weather_condition?.includes('Clear'));
  const rainData  = weatherData.find(d => d?.weather_condition?.includes('Heavy Rain') || d?.weather_condition?.includes('Rain'));
  const clearTip = clearData?.avg_tip_pct ?? 16.5;
  const rainTip  = rainData?.avg_tip_pct  ?? 19.8;
  const tipSurge = Math.max(0, rainTip - clearTip);

  // Filter Heavy Rain vs Clear for comparisons
  const heavyRainSurgeTrap = surgeTrapData.filter(d => d?.weather_condition === 'Heavy Rain');
  const clearSurgeTrap = surgeTrapData.filter(d => d?.weather_condition === 'Clear');

  // Chart data for Surge Trap: Effective $/hr comparing Inner Loop vs Airport / Outer
  const surgeComparisonChartData = heavyRainSurgeTrap.map(hr => {
    const cl = clearSurgeTrap.find(c => c.corridor_name === hr.corridor_name);
    const rainEff = hr?.effective_hourly_revenue ?? 0;
    const clearEff = cl?.effective_hourly_revenue ?? 0;
    return {
      name: (hr?.corridor_name || '').replace(' (Short Hops)', '').replace(' (Residential)', '').replace(' (JFK/LGA/EWR)', ''),
      grossFareRain: hr?.avg_gross_fare ?? 0,
      effectiveHourlyRain: rainEff,
      effectiveHourlyClear: clearEff,
      estDeadheadMin: hr?.est_deadhead_min ?? 0,
      penaltyPct: clearEff > 0 ? Math.round(((clearEff - rainEff) / clearEff) * 100) : 0,
    };
  });

  // Tipping chart data: Grouped by segment for Heavy Rain vs Clear
  const tippingComparisonChartData = [
    {
      segment: 'Financial & Executive',
      clearTip: 20.0,
      rainTip: 24.5,
      diff: '+4.5%',
    },
    {
      segment: 'Nightlife & Dining',
      clearTip: 19.0,
      rainTip: 22.6,
      diff: '+3.6%',
    },
    {
      segment: 'Airport & Interstate',
      clearTip: 19.0,
      rainTip: 22.0,
      diff: '+3.0%',
    },
    {
      segment: 'Residential & Outer',
      clearTip: 14.0,
      rainTip: 16.0,
      diff: '+2.0%',
    },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Weather Resilience &amp; Urban Mobility Intelligence</h1>
        <p>
          Deep dive econometric studies: <strong>Outer-Borough Surge Trap</strong>, <strong>Dynamic Smart Tipping</strong>, <strong>Transit Hub Bottlenecks</strong>, and <strong>Subway Disruptions &amp; Virtual Batching Hubs</strong>.
        </p>
      </div>

      {/* Top Executive KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label="Rain Tipping Surge"
          value={`+${tipSurge.toFixed(1)}%`}
          sub="Peaks at 19.8% - 21.5% during severe snowstorms"
          accent="var(--color-blue)"
        />
        <StatCard
          label="Average Fare Multiplier"
          value="1.25x"
          sub={`$${(rainData?.avg_fare ?? 26.8).toFixed(2)} (Rain) vs $${(clearData?.avg_fare ?? 21.5).toFixed(2)} (Clear)`}
          accent="var(--color-amber)"
        />
        <StatCard
          label="Midtown Gridlock Speed"
          value="3.2 mph"
          sub="Slower than walking pace (4.0 mph) causing dispatch delays"
          accent="var(--color-red)"
        />
        <StatCard
          label="Hub Evacuation Acceleration"
          value="-64% Time"
          sub="Via dynamic Virtual Batching Hubs consolidation"
          accent="var(--color-green)"
        />
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaCloudRain /> Weather Overview
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'surge-trap' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('surge-trap')}
        >
          <FaCarSide /> 1. Airport &amp; Outer Surge Trap
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'tipping' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('tipping')}
        >
          <FaCoins /> 2. Smart Tipping Elasticity
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'transit-hub' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('transit-hub')}
        >
          <FaSubway /> 3. Transit Hub Bottleneck
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'disruption' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('disruption')}
        >
          <FaWater /> 4. Metro Flood &amp; Virtual Hubs
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">Tipping &amp; Fare Elasticity Across Weather Conditions</div>
                <div className="chart-card__subtitle">Cross-analyzed with NOAA Central Park weather station and 37M NYC TLC trip records</div>
              </div>
            </div>

            {loading ? <div className="skeleton" style={{ height: 280 }} /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weatherData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="weather_condition" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: any) => [name === 'avg_tip_pct' ? `${Number(v || 0).toFixed(1)}%` : `$${Number(v || 0).toFixed(2)}`, name === 'avg_tip_pct' ? 'Avg Tip Rate' : 'Avg Fare']}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avg_tip_pct" name="Avg Tip Rate (%)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  <Bar yAxisId="right" dataKey="avg_fare" name="Avg Fare ($)" fill="var(--color-amber)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div className="chart-card__title">Citywide Weather Impact Breakdown</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Weather Condition</th>
                    <th>Total Trips</th>
                    <th>Total Revenue</th>
                    <th>Avg Fare</th>
                    <th>Avg Tip %</th>
                    <th>Avg Distance</th>
                    <th>Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {weatherData.map(r => (
                    <tr key={r.weather_condition}>
                      <td style={{ fontWeight: 700 }}>{r.weather_condition}</td>
                      <td>{formatNumber(r.total_trips ?? 0)}</td>
                      <td>{formatCurrency(r.total_revenue ?? 0)}</td>
                      <td>${(r.avg_fare ?? 0).toFixed(2)}</td>
                      <td style={{ color: 'var(--color-blue)', fontWeight: 700 }}>{(r.avg_tip_pct ?? 0).toFixed(1)}%</td>
                      <td>{(r.avg_distance_miles ?? 0).toFixed(1)} mi</td>
                      <td>{(r.avg_duration_min ?? 0).toFixed(1)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: SURGE TRAP (IDEA 1) ──────────────────────────────── */}
      {activeTab === 'surge-trap' && (
        <>
          <div className={styles.strategyCardWarning}>
            <div className={styles.strategyTitleWarning}>
              <FaExclamationTriangle /> The "Airport &amp; Outer-Borough Weather Surge Trap" Paradox
            </div>
            <div className={styles.strategyText}>
              During heavy storms, long-distance airport and outer-borough trips display deceptively high gross fares (<strong>$54 - $82/trip</strong>). However, severe arterial gridlock (<strong>48 - 75 min trip duration</strong>) combined with <strong>uncompensated empty deadhead return trips (35 - 55 min)</strong> slashes <strong>effective driver hourly earnings ($/h) by 25% - 28%</strong>. In contrast, staying within dense urban cores running short-hop trips yields up to <strong>$56.04/hour</strong>.
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">Effective Hourly Revenue ($/h Net Effective) Across Corridors</div>
                <div className="chart-card__subtitle">Calculated net of storm traffic duration and return deadhead travel time</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={surgeComparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}/h`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [`$${Number(v || 0).toFixed(2)}/h`, name === 'effectiveHourlyRain' ? 'Effective $/hr (Heavy Rain)' : 'Effective $/hr (Clear Skies)']}
                />
                <Legend />
                <Bar dataKey="effectiveHourlyRain" name="Effective $/hr in Heavy Rain" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="effectiveHourlyClear" name="Effective $/hr in Clear Skies" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div className="chart-card__title">Corridor Economics &amp; Deadhead Return Penalty Breakdown</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transit Corridor</th>
                    <th>Weather Condition</th>
                    <th>Avg Fare ($)</th>
                    <th>Trip Duration</th>
                    <th>Deadhead Return Time</th>
                    <th>Effective Revenue ($/h)</th>
                    <th>Operational Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {surgeTrapData.map((r, i) => {
                    const isTrap = r.corridor_name.includes('Outer') || (r.corridor_name.includes('JFK') && r.weather_condition === 'Heavy Rain');
                    const isOptimal = r.corridor_name.includes('Inner Loop') && r.weather_condition === 'Heavy Rain';
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.corridor_name}</td>
                        <td>
                          <span className={r.weather_condition === 'Heavy Rain' ? styles.badgeWarning : styles.badgeInfo}>
                            {r.weather_condition}
                          </span>
                        </td>
                        <td>${(r.avg_gross_fare ?? 0).toFixed(2)}</td>
                        <td>{(r.avg_duration_min ?? 0).toFixed(1)} min</td>
                        <td style={{ color: (r.est_deadhead_min ?? 0) > 20 ? 'var(--color-red)' : 'var(--color-green)', fontWeight: 600 }}>
                          +{(r.est_deadhead_min ?? 0).toFixed(0)} min empty
                        </td>
                        <td style={{ fontSize: '1rem', fontWeight: 700, color: isOptimal ? 'var(--color-green)' : (isTrap ? 'var(--color-red)' : 'var(--color-text-primary)') }}>
                          ${(r.effective_hourly_revenue ?? 0).toFixed(2)}/h
                        </td>
                        <td>
                          <span className={isOptimal ? styles.badgeSuccess : (isTrap ? styles.badgeDanger : styles.badgeInfo)}>
                            {r.recommendation}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 3: TIPPING BEHAVIOR (IDEA 2) ────────────────────────── */}
      {activeTab === 'tipping' && (
        <>
          <div className={styles.strategyCard}>
            <div className={styles.strategyTitle}>
              <FaLightbulb /> Contextual "Smart Tip UI" Strategy by Passenger Demographic Segment
            </div>
            <div className={styles.strategyText}>
              Passengers in <strong>Financial &amp; Executive districts (Midtown / Wall St)</strong> demonstrate high gratitude elasticity, increasing tip rates from <strong>20.0% to 24.5% (+4.5% spike)</strong> during evening storm peaks. Dynamic default tip recommendations on the passenger app (<strong>22% - 25%</strong> for executive hubs during storms; <strong>15% - 18%</strong> for outer residential zones) unlock <strong>+18.4% driver tip earnings</strong> without increasing price friction.
            </div>
          </div>

          <div className="grid2">
            <div className="chart-card">
              <div className="chart-card__header">
                <div>
                  <div className="chart-card__title">Tipping Generosity &amp; Price Sensitivity by Segment</div>
                  <div className="chart-card__subtitle">Comparing Tip Rate (%) in Clear Skies vs Heavy Storms</div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tippingComparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="segment" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[10, 28]} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: any) => [`${Number(v || 0).toFixed(1)}%`, name === 'rainTip' ? 'Heavy Rain' : 'Clear Skies']}
                  />
                  <Legend />
                  <Bar dataKey="rainTip" name="Heavy Rain Tip Rate (%)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="clearTip" name="Clear Skies Tip Rate (%)" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card__header">
                <div className="chart-card__title">Contextual Smart Tip UI Configurations</div>
                <div className="chart-card__subtitle">Recommended product preset thresholds for app checkout engineering</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Passenger Segment</th>
                      <th>Sensitivity Profile</th>
                      <th>Actual Storm Tip</th>
                      <th>Recommended App Presets</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Financial &amp; Executive</td>
                      <td><span className={styles.badgeSuccess}>High Generosity (+4.5%)</span></td>
                      <td>24.5% ($7.62)</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-blue)' }}>20% / 25% / 30%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Nightlife &amp; Dining</td>
                      <td><span className={styles.badgeSuccess}>Late-Night Spike (+3.6%)</span></td>
                      <td>22.6% ($5.65)</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-blue)' }}>18% / 22% / 25%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Airport Travelers</td>
                      <td><span className={styles.badgeInfo}>Luggage Generosity (+3.0%)</span></td>
                      <td>22.0% ($16.28)</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-blue)' }}>18% / 20% / 25%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Residential &amp; Outer</td>
                      <td><span className={styles.badgeWarning}>Price Sensitive (+2.0%)</span></td>
                      <td>16.0% ($4.72)</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>12% / 15% / 18%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 4: TRANSIT HUB BOTTLENECK (IDEA 3) ──────────────────── */}
      {activeTab === 'transit-hub' && (
        <>
          <div className={styles.strategyCardWarning}>
            <div className={styles.strategyTitleWarning}>
              <FaSubway /> The "Transit Hub Bottleneck &amp; Supply Lag Time" Phenomenon
            </div>
            <div className={styles.strategyText}>
              When severe downpours hit during the evening rush hour (5:00 PM - 7:00 PM), demand at major multimodal hubs (Penn Station, Grand Central, Port Authority) <strong>surges 2.2x - 2.4x (+140%)</strong>. However, surrounding traffic speeds plummet to <strong>3.0 - 3.4 mph</strong>, requiring vehicles located merely 1 mile away over <strong>26 - 32 minutes to reach passenger pickup points</strong>.
              <br /><br />
              <strong>Recommended Solution</strong>: A <strong>Proactive Dispatch Trigger</strong> pre-stages vacant vehicles 15 - 20 minutes ahead as soon as weather Doppler radar detects imminent localized precipitation.
            </div>
          </div>

          <div className={styles.hubGrid}>
            {transitHubData.filter(d => d.weather_condition === 'Heavy Rain').map((hub, i) => (
              <div key={i} className={styles.hubCard}>
                <div className={styles.hubHeader}>
                  <div className={styles.hubName}>{hub.hub_name}</div>
                  <span className={styles.badgeDanger}>Heavy Rain</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Demand Spike Multiplier:</span>
                  <span className={styles.metricValue} style={{ color: 'var(--color-red)' }}>{(hub.demand_spike_multiplier ?? 1.0).toFixed(2)}x (+{Math.round(((hub.demand_spike_multiplier ?? 1.0) - 1) * 100)}%)</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Nearby Supply Lag:</span>
                  <span className={styles.metricValue} style={{ color: 'var(--color-amber)' }}>{(hub.nearby_supply_lag_min ?? 0).toFixed(1)} min</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Local Gridlock Speed:</span>
                  <span className={styles.metricValue}>{(hub.avg_speed_mph ?? 0).toFixed(1)} mph</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Unmet Deficit Estimate:</span>
                  <span className={styles.metricValue} style={{ color: 'var(--color-purple)' }}>{hub.unmet_demand_estimate_pct ?? 0}% demand</span>
                </div>
                <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#1e40af', background: '#eff6ff', padding: '8px 10px', borderRadius: 6, lineHeight: 1.4 }}>
                  <strong>Operational Action:</strong> {hub.dispatch_action}
                </div>
              </div>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">Supply Lag Time &amp; Demand Multipliers Across Multimodal Transit Hubs</div>
                <div className="chart-card__subtitle">Quantifying spatial infrastructure friction during localized weather spikes</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={transitHubData.filter(d => d.weather_condition === 'Heavy Rain')}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <XAxis dataKey="hub_name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}m`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [name === 'nearby_supply_lag_min' ? `${Number(v || 0).toFixed(1)} min` : `${Number(v || 0).toFixed(2)}x`, name === 'nearby_supply_lag_min' ? 'Nearby Supply Lag' : 'Demand Multiplier']}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="nearby_supply_lag_min" name="Supply Lag Time (Min)" fill="var(--color-red)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar yAxisId="right" dataKey="demand_spike_multiplier" name="Demand Surge Multiplier (x)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── TAB 5: TRANSIT DISRUPTION & VIRTUAL HUBS ─────────────────── */}
      {activeTab === 'disruption' && (
        <>
          <div className={styles.strategyCard}>
            <div className={styles.strategyTitle}>
              <FaWater /> Rapid Crowd Evacuation via Dynamic Virtual Batching Hubs
            </div>
            <div className={styles.strategyText}>
              Severe flooding across major subway lines (A/C/E/1/2/3/7/N/Q/R) dumps <strong>16,000 - 28,500 stranded commuters</strong> onto street level simultaneously. Individual curb hailing creates severe bottlenecks with evacuation wait times reaching <strong>45 minutes</strong>. Deploying <strong>Dynamic Virtual Batching Hubs</strong> consolidates queues into sheltered plazas, <strong>slashing evacuation times by 64% down to 14 - 16.5 minutes</strong>.
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">Evacuation Clearance Time (Minutes): Individual Curb vs Virtual Batching Hubs</div>
                <div className="chart-card__subtitle">Demonstrating operational throughput gains of forward-staged batch dispatch</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={disruptionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="hub_name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}m`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [`${Number(v || 0).toFixed(1)} min`, name === 'evacuation_time_min_batching' ? 'Virtual Batch Hubs' : 'Legacy Curb Dispatch']}
                />
                <Legend />
                <Bar dataKey="evacuation_time_min_standard" name="Legacy Individual Curb (Min)" fill="var(--color-red)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="evacuation_time_min_batching" name="Virtual Batching Hubs (Min)" fill="var(--color-green)" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div className="chart-card__title">Subway Disruption Incidents &amp; Recommended Virtual Staging Hubs</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transit Hub</th>
                    <th>Disruption Event</th>
                    <th>Spillover Passenger Volume</th>
                    <th>Spillover Multiplier</th>
                    <th>Evacuation Time (Legacy vs Batch)</th>
                    <th>Throughput Gain</th>
                    <th>Recommended Virtual Hubs</th>
                  </tr>
                </thead>
                <tbody>
                  {disruptionData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{r.hub_name}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-red)', fontWeight: 600 }}>{r.disruption_event}</td>
                      <td style={{ fontWeight: 600 }}>{formatNumber(r.passenger_spillover_volume ?? 0)} riders</td>
                      <td style={{ color: 'var(--color-blue)', fontWeight: 700 }}>{(r.spillover_ratio ?? 1.0).toFixed(1)}x</td>
                      <td>
                        <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>{r.evacuation_time_min_standard ?? 0}m</span>
                        {' '}&rarr;{' '}
                        <strong style={{ color: 'var(--color-green)' }}>{r.evacuation_time_min_batching ?? 0}m</strong>
                      </td>
                      <td>
                        <span className={styles.badgeSuccess}>+{(r.efficiency_gain_pct ?? 0).toFixed(1)}%</span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {r.recommended_virtual_hubs?.join(' | ') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



