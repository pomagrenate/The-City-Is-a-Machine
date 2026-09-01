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
  Cell,
} from 'recharts';
import {
  FaCloudRain,
  FaCarSide,
  FaCoins,
  FaSubway,
  FaWater,
  FaLightbulb,
  FaExclamationTriangle,
  FaCheckCircle,
  FaExchangeAlt,
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
      setWeatherData(w);
      setSurgeTrapData(s);
      setTippingData(t);
      setTransitHubData(th);
      setDisruptionData(ds);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const clearData = weatherData.find(d => d.weather_condition?.includes('Clear'));
  const rainData  = weatherData.find(d => d.weather_condition?.includes('Heavy Rain') || d.weather_condition?.includes('Rain'));
  const clearTip = clearData?.avg_tip_pct || 16.5;
  const rainTip  = rainData?.avg_tip_pct  || 19.8;
  const tipSurge = rainTip - clearTip;

  // Filter Heavy Rain vs Clear for comparisons
  const heavyRainSurgeTrap = surgeTrapData.filter(d => d.weather_condition === 'Heavy Rain');
  const clearSurgeTrap = surgeTrapData.filter(d => d.weather_condition === 'Clear');

  // Chart data for Surge Trap: Effective $/hr comparing Inner Loop vs Airport / Outer
  const surgeComparisonChartData = heavyRainSurgeTrap.map(hr => {
    const cl = clearSurgeTrap.find(c => c.corridor_name === hr.corridor_name);
    return {
      name: hr.corridor_name.replace(' (Short Hops)', '').replace(' (Residential)', '').replace(' (JFK/LGA/EWR)', ''),
      grossFareRain: hr.avg_gross_fare,
      effectiveHourlyRain: hr.effective_hourly_revenue,
      effectiveHourlyClear: cl ? cl.effective_hourly_revenue : 0,
      estDeadheadMin: hr.est_deadhead_min,
      penaltyPct: cl ? Math.round(((cl.effective_hourly_revenue - hr.effective_hourly_revenue) / cl.effective_hourly_revenue) * 100) : 0,
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
          Khám phá các chuyên đề phân tích kinh tế đô thị: <strong>Bẫy Doanh Thu Ngoại Ô (Surge Trap)</strong>, <strong>Phân Hóa Tiền Tip (Smart Tipping)</strong>, <strong>Nút Thắt Cổ Chai Ga Tàu</strong> và <strong>Sự Cố Metro &amp; Sảnh Đón Ảo (Virtual Batching Hubs)</strong>.
        </p>
      </div>

      {/* Top Executive KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label="Mức Tăng Tip Ngày Mưa"
          value={`+${tipSurge.toFixed(1)}%`}
          sub="Đạt đỉnh 19.8% - 21.5% trong bão tuyết"
          accent="var(--color-blue)"
        />
        <StatCard
          label="Mức Tăng Giá Cước"
          value={`1.25×`}
          sub={`$${(rainData?.avg_fare || 26.8).toFixed(2)} (Mưa) vs $${(clearData?.avg_fare || 21.5).toFixed(2)} (Nắng)`}
          accent="var(--color-amber)"
        />
        <StatCard
          label="Tốc Độ Giờ Kẹt Xe Midtown"
          value="3.2 mph"
          sub="Chậm hơn đi bộ (4.0 mph) gây trễ điều phối"
          accent="var(--color-red)"
        />
        <StatCard
          label="Rút Ngắn Giải Tỏa Ga"
          value="-64% Time"
          sub="Nhờ cơ chế gom khách sảnh đón ảo (Batch Hub)"
          accent="var(--color-green)"
        />
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaCloudRain /> Tổng Quan Thời Tiết
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'surge-trap' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('surge-trap')}
        >
          <FaCarSide /> 1. Bẫy Sân Bay &amp; Ngoại Ô (Surge Trap)
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'tipping' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('tipping')}
        >
          <FaCoins /> 2. Phân Hóa Tiền Tip (Smart Tipping)
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'transit-hub' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('transit-hub')}
        >
          <FaSubway /> 3. Nút Thắt Ga Tàu (Transit Bottleneck)
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'disruption' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('disruption')}
        >
          <FaWater /> 4. Sự Cố Metro &amp; Sảnh Đón Ảo (Batch Hubs)
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">Độ Co Giãn Của Tiền Tip &amp; Giá Cước Theo Điều Kiện Thời Tiết</div>
                <div className="chart-card__subtitle">Dữ liệu kết hợp trạm quan trắc NOAA Central Park và 37 triệu chuyến xe NYC TLC</div>
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
                    formatter={(v: any, name: any) => [name === 'avg_tip_pct' ? `${Number(v).toFixed(1)}%` : `$${Number(v).toFixed(2)}`, name === 'avg_tip_pct' ? 'Tỷ Lệ Tip' : 'Giá Cước TB']}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avg_tip_pct" name="Tỷ Lệ Tip TB (%)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  <Bar yAxisId="right" dataKey="avg_fare" name="Giá Cước TB ($)" fill="var(--color-amber)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div className="chart-card__title">Chi Tiết Tác Động Thời Tiết Toàn Thành Phố</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Điều Kiện Thời Tiết</th>
                    <th>Tổng Cuốc Xe</th>
                    <th>Tổng Doanh Thu</th>
                    <th>Giá Cước TB</th>
                    <th>Tỷ Lệ Tip TB</th>
                    <th>Cự Ly TB</th>
                    <th>Thời Lượng TB</th>
                  </tr>
                </thead>
                <tbody>
                  {weatherData.map(r => (
                    <tr key={r.weather_condition}>
                      <td style={{ fontWeight: 700 }}>{r.weather_condition}</td>
                      <td>{formatNumber(r.total_trips)}</td>
                      <td>{formatCurrency(r.total_revenue)}</td>
                      <td>${r.avg_fare.toFixed(2)}</td>
                      <td style={{ color: 'var(--color-blue)', fontWeight: 700 }}>{r.avg_tip_pct.toFixed(1)}%</td>
                      <td>{r.avg_distance_miles.toFixed(1)} dặm</td>
                      <td>{r.avg_duration_min.toFixed(1)} phút</td>
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
              <FaExclamationTriangle /> Nghịch Lý "Bẫy Doanh Thu Ngoại Ô &amp; Sân Bay Ngày Mưa"
            </div>
            <div className={styles.strategyText}>
              Khi trời mưa lớn, cước chuyến đi sân bay hoặc ra ngoại ô có vẻ rất cao (<strong>$54 - $82/cuốc</strong>), nhưng thời gian kẹt xe kéo dài (<strong>48 - 75 phút</strong>) kết hợp với <strong>thời gian chạy rỗng quay đầu 100% (Deadhead 35 - 55 phút)</strong> khiến <strong>doanh thu thực tế mỗi giờ ($/h) bị giảm tới 25% - 28%</strong>. Ngược lại, nhận chuỗi cuốc ngắn nội đô liên hoàn giúp tài xế đạt tới <strong>$56.04/giờ</strong>.
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">So Sánh Doanh Thu Thực Tế Mỗi Giờ ($/h Net Effective) Giữa Các Hành Lang</div>
                <div className="chart-card__subtitle">Tính toán sau khi trừ toàn bộ thời gian di chuyển trong mưa + thời gian chạy rỗng quay đầu (Deadhead)</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={surgeComparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}/h`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [`$${Number(v).toFixed(2)}/h`, name === 'effectiveHourlyRain' ? 'Doanh Thu Thực Tế (Mưa Lớn)' : 'Doanh Thu Thực Tế (Trời Quang)']}
                />
                <Legend />
                <Bar dataKey="effectiveHourlyRain" name="Doanh Thu Thực Tế Ngày Mưa ($/h)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="effectiveHourlyClear" name="Doanh Thu Thực Tế Ngày Nắng ($/h)" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div className="chart-card__title">Bảng Chi Tiết Hành Lang Giao Thông &amp; Thời Gian Chạy Rỗng (Deadhead)</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hành Lang Giao Thông</th>
                    <th>Thời Tiết</th>
                    <th>Cước TB ($)</th>
                    <th>Thời Lượng Cuốc</th>
                    <th>Thời Gian Chạy Rỗng</th>
                    <th>Doanh Thu Thực Tế ($/h)</th>
                    <th>Đánh Giá &amp; Khuyến Nghị</th>
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
                        <td>${r.avg_gross_fare.toFixed(2)}</td>
                        <td>{r.avg_duration_min.toFixed(1)} phút</td>
                        <td style={{ color: r.est_deadhead_min > 20 ? 'var(--color-red)' : 'var(--color-green)', fontWeight: 600 }}>
                          +{r.est_deadhead_min.toFixed(0)} phút rỗng
                        </td>
                        <td style={{ fontSize: '1rem', fontWeight: 700, color: isOptimal ? 'var(--color-green)' : (isTrap ? 'var(--color-red)' : 'var(--color-text-primary)') }}>
                          ${r.effective_hourly_revenue.toFixed(2)}/h
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
              <FaLightbulb /> Chiến Lược "Smart Tip UI" Theo Ngữ Cảnh Thời Tiết &amp; Phân Khúc
            </div>
            <div className={styles.strategyText}>
              Khách hàng tại <strong>Khu Tài Chính &amp; Văn Phòng (Midtown/Financial Hub)</strong> sẵn sàng tăng mức tip từ <strong>20.0% lên 24.5% (+4.5% spike)</strong> khi mưa lớn vào giờ cao điểm. Đề xuất thuật toán hiển thị gợi ý Tip mặc định linh hoạt trên App (<strong>22% - 25%</strong> cho khu tài chính trong mưa; <strong>15% - 18%</strong> cho khu dân cư ngoại ô) giúp tăng <strong>+18.4% thu nhập tip</strong> cho tài xế mà không tạo cảm giác ép buộc.
            </div>
          </div>

          <div className="grid2">
            <div className="chart-card">
              <div className="chart-card__header">
                <div>
                  <div className="chart-card__title">Độ Nhạy Cảm &amp; Hào Phóng Tip Theo Phân Khúc Khách Hàng</div>
                  <div className="chart-card__subtitle">So sánh Tỷ lệ Tip (%) khi Trời Nắng vs Mưa Lớn</div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tippingComparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="segment" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[10, 28]} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name === 'rainTip' ? 'Mưa Lớn' : 'Trời Quang']}
                  />
                  <Legend />
                  <Bar dataKey="rainTip" name="Tỷ Lệ Tip Mưa Lớn (%)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="clearTip" name="Tỷ Lệ Tip Trời Nắng (%)" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card__header">
                <div className="chart-card__title">Gợi Ý Mức Tip Thông Minh (Smart Tip Config)</div>
                <div className="chart-card__subtitle">Cấu hình tham số đề xuất cho Product / App Engineering</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Phân Khúc Khách Hàng</th>
                      <th>Đặc Tính Nhạy Cảm</th>
                      <th>Mức Tip Thực Tế</th>
                      <th>Gợi Ý App UI</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Financial &amp; Executive</td>
                      <td><span className={styles.badgeSuccess}>Siêu hào phóng (+4.5%)</span></td>
                      <td>24.5% ($7.62)</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-blue)' }}>20% / 25% / 30%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Nightlife &amp; Dining</td>
                      <td><span className={styles.badgeSuccess}>Tăng mạnh đêm (+3.6%)</span></td>
                      <td>22.6% ($5.65)</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-blue)' }}>18% / 22% / 25%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Airport Travelers</td>
                      <td><span className={styles.badgeInfo}>Hào phóng hành lý (+3.0%)</span></td>
                      <td>22.0% ($16.28)</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-blue)' }}>18% / 20% / 25%</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Residential &amp; Outer</td>
                      <td><span className={styles.badgeWarning}>Nhạy cảm giá (+2.0%)</span></td>
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
              <FaSubway /> Hiện Tượng "Nút Thắt Cổ Chai Ga Tàu &amp; Độ Trễ Điều Phối (Lag Time)"
            </div>
            <div className={styles.strategyText}>
              Khi trời mưa đột ngột vào giờ tan tầm (17h00 - 19h00), nhu cầu đón xe tại các ga lớn (Penn Station, Grand Central, Port Authority) <strong>tăng vọt 2.2× - 2.4× (+140%)</strong>. Tuy nhiên, tốc độ kẹt xe tại Midtown giảm xuống chỉ còn <strong>3.0 - 3.4 mph</strong>, khiến xe taxi ở cự ly chỉ 1.5 km mất tới <strong>26 - 32 phút mới tiếp cận được ga</strong>. 
              <br /><br />
              👉 <strong>Giải Pháp Đề Xuất</strong>: Cơ chế <strong>Proactive Dispatch Trigger</strong> kích hoạt điều phối đón đầu trước 15 - 20 phút ngay khi radar thời tiết phát hiện mưa chuẩn bị chạm khu vực.
            </div>
          </div>

          <div className={styles.hubGrid}>
            {transitHubData.filter(d => d.weather_condition === 'Heavy Rain').map((hub, i) => (
              <div key={i} className={styles.hubCard}>
                <div className={styles.hubHeader}>
                  <div className={styles.hubName}>{hub.hub_name}</div>
                  <span className={styles.badgeDanger}>Mưa Lớn</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Hệ Số Vọt Nhu Cầu:</span>
                  <span className={styles.metricValue} style={{ color: 'var(--color-red)' }}>{hub.demand_spike_multiplier}× (+{Math.round((hub.demand_spike_multiplier - 1) * 100)}%)</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Độ Trễ Tiếp Cận Ga:</span>
                  <span className={styles.metricValue} style={{ color: 'var(--color-amber)' }}>{hub.nearby_supply_lag_min} phút</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Tốc Độ Kẹt Xe Vùng:</span>
                  <span className={styles.metricValue}>{hub.avg_speed_mph} mph</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Ước Tính Cháy Xe:</span>
                  <span className={styles.metricValue} style={{ color: 'var(--color-purple)' }}>{hub.unmet_demand_estimate_pct}% nhu cầu</span>
                </div>
                <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#1e40af', background: '#eff6ff', padding: '8px 10px', borderRadius: 6, lineHeight: 1.4 }}>
                  <strong>Hành Động:</strong> {hub.dispatch_action}
                </div>
              </div>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">Độ Trễ Điều Phối Xe (Supply Lag Time) &amp; Hệ Số Nhu Cầu Theo Từng Ga</div>
                <div className="chart-card__subtitle">Minh chứng cho nút thắt cổ chai hạ tầng giao thông khiến xe lân cận không kịp tiếp cận</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={transitHubData.filter(d => d.weather_condition === 'Heavy Rain')}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <XAxis dataKey="hub_name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}p`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}x`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [name === 'nearby_supply_lag_min' ? `${Number(v).toFixed(1)} phút` : `${Number(v).toFixed(2)}x`, name === 'nearby_supply_lag_min' ? 'Độ Trễ Tiếp Cận' : 'Hệ Số Vọt Nhu Cầu']}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="nearby_supply_lag_min" name="Độ Trễ Tiếp Cận Ga (Phút)" fill="var(--color-red)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar yAxisId="right" dataKey="demand_spike_multiplier" name="Hệ Số Vọt Nhu Cầu (×)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── TAB 5: TRANSIT DISRUPTION & VIRTUAL HUBS (NEW IDEA 1) ── */}
      {activeTab === 'disruption' && (
        <>
          <div className={styles.strategyCard}>
            <div className={styles.strategyTitle}>
              <FaWater /> Chuyên Đề: Giải Tỏa Hành Khách Khi Metro Ngập Úng (Virtual Batching Hubs)
            </div>
            <div className={styles.strategyText}>
              Mưa bão gây ngập đường ray các tuyến tàu điện ngầm lớn (A/C/E/1/2/3/7/N/Q/R), đẩy đột ngột <strong>16,000 - 28,500 hành khách</strong> lên mặt đất. Đón khách lẻ tẻ khiến đường trước cửa ga tê liệt và thời gian giải tỏa lên tới <strong>45 phút</strong>. Áp dụng <strong>Điểm Đón Khẩn Cấp Linh Hoạt (Dynamic Virtual Pick-up Hubs)</strong> gom khách vào các sảnh khô ráo và điều phối xe theo lô giúp <strong>rút ngắn 64% thời gian giải tỏa xuống chỉ còn 14 - 16.5 phút</strong>.
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div>
                <div className="chart-card__title">So Sánh Thời Gian Giải Tỏa Đám Đông (Phút): Đón Lẻ Tẻ vs Gom Đón Theo Lô (Virtual Hub)</div>
                <div className="chart-card__subtitle">Minh họa hiệu quả vận hành vượt trội của cơ chế Virtual Batching Hubs</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={disruptionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="hub_name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}p`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, name: any) => [`${Number(v).toFixed(1)} phút`, name === 'evacuation_time_min_batching' ? 'Gom Đón Theo Lô (Virtual Hub)' : 'Đón Lẻ Tẻ Truyền Thống']}
                />
                <Legend />
                <Bar dataKey="evacuation_time_min_standard" name="Đón Lẻ Tẻ Truyền Thống (Phút)" fill="var(--color-red)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="evacuation_time_min_batching" name="Sảnh Đón Ảo Virtual Batch Hub (Phút)" fill="var(--color-green)" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-card__header">
              <div className="chart-card__title">Bảng Chi Tiết Sự Cố Ngập Metro &amp; Điểm Đón Khẩn Cấp Ảo Đề Xuất</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ga / Điểm Trung Chuyển</th>
                    <th>Sự Cố Gián Đoạn Tuyến</th>
                    <th>Lượng Khách Tràn Lên Mặt Đất</th>
                    <th>Hệ Số Tràn (Spillover)</th>
                    <th>Thời Gian Giải Tỏa Cũ vs Mới</th>
                    <th>Hiệu Suất Tăng</th>
                    <th>Sảnh Đón Ảo Được Đề Xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {disruptionData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{r.hub_name}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-red)', fontWeight: 600 }}>{r.disruption_event}</td>
                      <td style={{ fontWeight: 600 }}>{formatNumber(r.passenger_spillover_volume)} khách</td>
                      <td style={{ color: 'var(--color-blue)', fontWeight: 700 }}>{r.spillover_ratio}×</td>
                      <td>
                        <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>{r.evacuation_time_min_standard}p</span>
                        {' '}&rarr;{' '}
                        <strong style={{ color: 'var(--color-green)' }}>{r.evacuation_time_min_batching}p</strong>
                      </td>
                      <td>
                        <span className={styles.badgeSuccess}>+{r.efficiency_gain_pct.toFixed(1)}%</span>
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {r.recommended_virtual_hubs?.join(' | ')}
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


