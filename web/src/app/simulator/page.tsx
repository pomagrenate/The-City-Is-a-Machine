'use client';

import { useEffect, useState, useMemo } from 'react';
import { getData, formatCurrency, formatNumber, DAY_NAMES } from '@/lib/data';
import type { SimulatorBase, ZoneRevenue, SurgeElasticityPoint } from '@/types';
import StatCard from '@/components/ui/StatCard';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  FaSlidersH,
  FaChartLine,
  FaBolt,
  FaExclamationTriangle,
  FaLightbulb,
  FaCheckCircle,
} from 'react-icons/fa';
import styles from './simulator.module.css';

export default function SimulatorPage() {
  const [baseData, setBaseData] = useState<SimulatorBase[]>([]);
  const [zones, setZones]       = useState<ZoneRevenue[]>([]);
  const [surgeCurve, setSurgeCurve] = useState<SurgeElasticityPoint[]>([]);
  const [loading, setLoading]   = useState(true);

  // Form inputs for Fleet Simulator
  const [selectedBorough, setSelectedBorough] = useState<string>('Manhattan');
  const [selectedZoneId, setSelectedZoneId]   = useState<number | null>(null);
  const [selectedDay, setSelectedDay]         = useState<number>(4); // Friday
  const [selectedHour, setSelectedHour]       = useState<number>(18); // 6 PM
  const [additionalVehicles, setAdditionalVehicles] = useState<number>(500);

  // Form inputs for Surge Pricing Elasticity Simulator
  const [selectedSurge, setSelectedSurge] = useState<number>(1.8);

  useEffect(() => {
    Promise.all([
      getData.simulatorBase().catch(() => []),
      getData.zoneRevenue().catch(() => []),
      getData.surgeElasticityCurve().catch(() => []),
    ]).then(([b, z, s]) => {
      setBaseData(b);
      setZones(z);
      setSurgeCurve(s);
      if (z.length > 0) {
        const defaultZone = z.find(item => item.borough === 'Manhattan') || z[0];
        setSelectedZoneId(defaultZone.location_id);
      }
      setLoading(false);
    });
  }, []);

  const filteredZones = useMemo(() => {
    return zones.filter(z => z.borough === selectedBorough);
  }, [zones, selectedBorough]);

  const handleBoroughChange = (b: string) => {
    setSelectedBorough(b);
    const firstZone = zones.find(z => z.borough === b);
    if (firstZone) {
      setSelectedZoneId(firstZone.location_id);
    }
  };

  const selectedZoneObj = useMemo(() => {
    return zones.find(z => z.location_id === selectedZoneId);
  }, [zones, selectedZoneId]);

  const currentSlotData = useMemo(() => {
    if (!selectedZoneId) return null;
    return baseData.find(
      d => d.location_id === selectedZoneId && d.pickup_dayofweek === selectedDay && d.pickup_hour === selectedHour
    );
  }, [baseData, selectedZoneId, selectedDay, selectedHour]);

  const simulationResults = useMemo(() => {
    const historicalTrips = currentSlotData?.historical_trips || Math.round((selectedZoneObj?.total_trips || 1000) / 168);
    const avgFare = currentSlotData?.avg_revenue_per_trip || selectedZoneObj?.avg_revenue_per_trip || 22.5;

    const capacityPerVehicle = 3.2;
    const newSupplyCapacity = additionalVehicles * capacityPerVehicle;

    const estimatedUnmetDemand = Math.round(historicalTrips * 0.28);
    const newlyServedTrips = Math.round(Math.min(estimatedUnmetDemand, newSupplyCapacity * 0.72));

    const extraRevenue = newlyServedTrips * avgFare;
    const demandServedIncreasePct = historicalTrips > 0 ? (newlyServedTrips / historicalTrips) * 100 : 0;
    const idleTimeReductionPct = Math.min(18.5, (newlyServedTrips / (historicalTrips + 1)) * 45);

    return {
      historicalTrips,
      newlyServedTrips,
      totalProjectedTrips: historicalTrips + newlyServedTrips,
      avgFare,
      extraRevenue,
      demandServedIncreasePct,
      idleTimeReductionPct,
    };
  }, [currentSlotData, selectedZoneObj, additionalVehicles]);

  // Find exact or closest surge point
  const currentSurgePoint = useMemo(() => {
    if (surgeCurve.length === 0) return null;
    return surgeCurve.find(p => Math.abs(p.surge_multiplier - selectedSurge) < 0.05) || surgeCurve[4];
  }, [surgeCurve, selectedSurge]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Operational &amp; Pricing Decision Simulator</h1>
        <p>
          Mô phỏng 2 bài toán can thiệp vận hành &amp; kinh tế học cốt lõi: <strong>Điều Phối Đội Xe (Fleet Rebalancing)</strong> và <strong>Độ Co Giãn Giá Surge (Surge Pricing Elasticity &amp; GMV Sweet Spot)</strong>.
        </p>
      </div>

      {/* ── MODULE 1: SURGE PRICING ELASTICITY SIMULATOR (IDEA 2) ── */}
      <div className="chart-card" style={{ border: '2px solid var(--color-blue-mid)', marginBottom: 32 }}>
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-blue)' }}>
              <FaBolt /> Chuyên Đề 2: Điểm Gãy Của Surge Pricing &amp; Đường Cong Tối Ưu GMV
            </div>
            <div className="chart-card__subtitle">
              Mô phỏng phản ứng của khách hàng khi tăng hệ số Surge (1.0× - 3.0×). Khám phá điểm gãy cầu (Demand Evaporation) và bẫy kẹt thanh khoản (Liquidity Deadlock).
            </div>
          </div>
        </div>

        {/* Surge Slider & Live Metrics */}
        <div style={{ background: 'var(--color-surface-2)', padding: '20px 24px', borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
              Hệ Số Giá Surge Đang Mô Phỏng:
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: selectedSurge > 2.0 ? 'var(--color-red)' : (selectedSurge >= 1.6 && selectedSurge <= 1.8 ? 'var(--color-green)' : 'var(--color-blue)') }}>
              {selectedSurge.toFixed(1)}×
            </span>
          </div>

          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.2}
            value={selectedSurge}
            onChange={e => setSelectedSurge(Number(e.target.value))}
            className={styles.range}
            style={{ height: 8 }}
          />
          <div className={styles.rangeScale} style={{ marginTop: 4 }}>
            <span>1.0× (Gốc)</span>
            <span>1.4×</span>
            <span style={{ fontWeight: 700, color: 'var(--color-green)' }}>★ 1.8× (Điểm Vàng GMV)</span>
            <span style={{ color: 'var(--color-amber)' }}>2.2×</span>
            <span style={{ color: 'var(--color-red)' }}>3.0× (Kẹt Thanh Khoản)</span>
          </div>
        </div>

        {/* Real-time Surge KPI Grid */}
        {currentSurgePoint && (
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <StatCard
              label="Tổng Giá Trị Giao Dịch (GMV)"
              value={formatCurrency(currentSurgePoint.total_gmv)}
              sub={selectedSurge === 1.8 ? '★ CỰC ĐẠI GMV (Sweet Spot)' : `Doanh thu sàn: ${formatCurrency(currentSurgePoint.platform_revenue)}`}
              accent={selectedSurge === 1.8 ? 'var(--color-green)' : (selectedSurge > 2.0 ? 'var(--color-red)' : 'var(--color-blue)')}
            />
            <StatCard
              label="Tỷ Lệ Đặt Xe Thành Công"
              value={`${currentSurgePoint.customer_conversion_rate_pct.toFixed(1)}%`}
              sub={`${formatNumber(currentSurgePoint.completed_trips)} cuốc hoàn thành`}
              accent="var(--color-blue)"
            />
            <StatCard
              label="Tỷ Lệ Khách Bỏ App"
              value={`${currentSurgePoint.customer_abandonment_pct.toFixed(1)}%`}
              sub={currentSurgePoint.customer_abandonment_pct > 50 ? 'Khách quay lưng vì giá phi lý' : 'Độ chấp nhận giá tốt'}
              accent={currentSurgePoint.customer_abandonment_pct > 50 ? 'var(--color-red)' : 'var(--color-green)'}
            />
            <StatCard
              label="Trạng Thái Thị Trường"
              value={currentSurgePoint.market_state.includes('ĐIỂM') ? currentSurgePoint.market_state.split(' ')[0] : 'Ổn Định'}
              sub={currentSurgePoint.market_state}
              accent={selectedSurge > 2.0 ? 'var(--color-red)' : 'var(--color-green)'}
            />
          </div>
        )}

        {/* Surge Elasticity Chart */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 12, color: 'var(--color-text-secondary)' }}>
            Biểu Đồ Đường Cong GMV ($) &amp; Tỷ Lệ Chuyển Đổi Khách Hàng (%) Theo Hệ Số Surge
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={surgeCurve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="surge_multiplier" tickFormatter={v => `${v}×`} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: any) => [name === 'total_gmv' ? formatCurrency(Number(v)) : `${Number(v).toFixed(1)}%`, name === 'total_gmv' ? 'Tổng GMV' : (name === 'customer_conversion_rate_pct' ? 'Tỷ Lệ Chốt Cuốc' : 'Tỷ Lệ Bỏ App')]}
              />
              <Legend />
              <ReferenceLine yAxisId="left" x={1.8} stroke="var(--color-green)" strokeDasharray="3 3" label={{ value: 'Sweet Spot (1.8×)', fill: 'var(--color-green)', fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="total_gmv" name="Tổng GMV Giao Dịch ($)" fill="var(--color-blue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="customer_conversion_rate_pct" name="Tỷ Lệ Chốt Cuốc (%)" stroke="var(--color-green)" strokeWidth={3} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="customer_abandonment_pct" name="Tỷ Lệ Khách Bỏ App (%)" stroke="var(--color-red)" strokeWidth={2} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Insight / Recommendation Box */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FaLightbulb color="var(--color-amber)" /> Đề Xuất Cơ Chế "Smart Surge Cap + Micro-Subsidies" Cho Product Lead:
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Khi Surge vượt quá <strong>2.0×</strong>, tỷ lệ khách bỏ app tăng vọt lên <strong>48% - 88%</strong>, khiến tài xế chạy đến vùng giá cao nhưng thời gian chờ rỗng (Idle Time) tăng lên <strong>38 phút</strong>. Đề xuất khóa trần Surge thông minh ở mức <strong>1.8×</strong> và trích 5% phí nền tảng để thưởng trực tiếp cho tài xế hoàn thành cuốc trong mưa bão, bảo vệ tổng GMV tối đa.
          </div>
        </div>
      </div>

      {/* ── MODULE 2: FLEET REBALANCING SIMULATOR ── */}
      <div className="page-header" style={{ marginTop: 12 }}>
        <h2>Mô Phỏng Điều Phối Đội Xe Theo Khu Vực &amp; Khung Giờ</h2>
        <p>Mô phỏng kịch bản: &quot;Điều phối thêm N tài xế đến Zone X vào Thứ Sáu lúc 18h00 thì doanh thu và độ phủ tăng bao nhiêu?&quot;</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Controls Card */}
        <div className="chart-card" style={{ marginBottom: 0 }}>
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Scenario Inputs</div>
              <div className="chart-card__subtitle">Configure operational redistribution</div>
            </div>
          </div>

          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>1. Select Borough</label>
              <select
                className={styles.select}
                value={selectedBorough}
                onChange={e => handleBoroughChange(e.target.value)}
              >
                {Array.from(new Set(zones.map(z => z.borough))).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>2. Select Target Zone</label>
              <select
                className={styles.select}
                value={selectedZoneId || ''}
                onChange={e => setSelectedZoneId(Number(e.target.value))}
              >
                {filteredZones.map(z => (
                  <option key={z.location_id} value={z.location_id}>
                    {z.zone} (${z.avg_revenue_per_trip.toFixed(2)}/trip)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className={styles.formGroup}>
                <label className={styles.label}>3. Day of Week</label>
                <select
                  className={styles.select}
                  value={selectedDay}
                  onChange={e => setSelectedDay(Number(e.target.value))}
                >
                  {DAY_NAMES.map((day, idx) => (
                    <option key={day} value={idx}>{day}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>4. Time Window</label>
                <select
                  className={styles.select}
                  value={selectedHour}
                  onChange={e => setSelectedHour(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h-12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.rangeHeader}>
                <label className={styles.label}>5. Additional Vehicles</label>
                <span className={styles.rangeValue}>+{additionalVehicles} drivers</span>
              </div>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={additionalVehicles}
                onChange={e => setAdditionalVehicles(Number(e.target.value))}
                className={styles.range}
              />
              <div className={styles.rangeScale}>
                <span>+50</span>
                <span>+500</span>
                <span>+1,000</span>
                <span>+2,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="chart-card" style={{ marginBottom: 0 }}>
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Projected Impact</div>
              <div className="chart-card__subtitle">
                Target: {selectedZoneObj?.zone || 'Selected Zone'} ({DAY_NAMES[selectedDay]} @ {selectedHour}:00)
              </div>
            </div>
          </div>

          <div className={styles.resultsGrid}>
            <div className={styles.resultBox}>
              <div className={styles.resultLabel}>Est. Demand Served</div>
              <div className={styles.resultValue} style={{ color: 'var(--color-green)' }}>
                +{simulationResults.demandServedIncreasePct.toFixed(1)}%
              </div>
              <div className={styles.resultSub}>+{formatNumber(simulationResults.newlyServedTrips)} additional trips</div>
            </div>

            <div className={styles.resultBox}>
              <div className={styles.resultLabel}>Projected Revenue Uplift</div>
              <div className={styles.resultValue} style={{ color: 'var(--color-blue)' }}>
                +{formatCurrency(simulationResults.extraRevenue)}
              </div>
              <div className={styles.resultSub}>Based on ${simulationResults.avgFare.toFixed(2)} avg fare</div>
            </div>

            <div className={styles.resultBox}>
              <div className={styles.resultLabel}>Vehicle Idle Time</div>
              <div className={styles.resultValue} style={{ color: 'var(--color-purple)' }}>
                -{simulationResults.idleTimeReductionPct.toFixed(1)}%
              </div>
              <div className={styles.resultSub}>Optimized pickup density</div>
            </div>

            <div className={styles.resultBox}>
              <div className={styles.resultLabel}>New Total Trips</div>
              <div className={styles.resultValue} style={{ color: 'var(--color-text-primary)' }}>
                {formatNumber(simulationResults.totalProjectedTrips)}
              </div>
              <div className={styles.resultSub}>Baseline: {formatNumber(simulationResults.historicalTrips)} trips</div>
            </div>
          </div>

          <div className={styles.summaryBox}>
            <div className={styles.summaryTitle}>Operational Recommendation</div>
            <p className={styles.summaryText}>
              Deploying <strong>{additionalVehicles} drivers</strong> to <strong>{selectedZoneObj?.zone}</strong> during {DAY_NAMES[selectedDay]} {selectedHour}:00 peak is expected to capture <strong>{formatNumber(simulationResults.newlyServedTrips)} unfulfilled trips</strong>, generating roughly <strong>{formatCurrency(simulationResults.extraRevenue)}</strong> in incremental revenue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

