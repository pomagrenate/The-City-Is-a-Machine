'use client';

import { useEffect, useState, useMemo } from 'react';
import { getData, formatCurrency, formatNumber, DAY_NAMES } from '@/lib/data';
import type { SimulatorBase, ZoneRevenue } from '@/types';
import StatCard from '@/components/ui/StatCard';
import styles from './simulator.module.css';

export default function SimulatorPage() {
  const [baseData, setBaseData] = useState<SimulatorBase[]>([]);
  const [zones, setZones]       = useState<ZoneRevenue[]>([]);
  const [loading, setLoading]   = useState(true);

  // Form inputs
  const [selectedBorough, setSelectedBorough] = useState<string>('Manhattan');
  const [selectedZoneId, setSelectedZoneId]   = useState<number | null>(null);
  const [selectedDay, setSelectedDay]         = useState<number>(4); // Friday
  const [selectedHour, setSelectedHour]       = useState<number>(18); // 6 PM
  const [additionalVehicles, setAdditionalVehicles] = useState<number>(500);

  useEffect(() => {
    Promise.all([getData.simulatorBase(), getData.zoneRevenue()]).then(([b, z]) => {
      setBaseData(b);
      setZones(z);
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

  // Handle borough change by selecting first available zone in borough
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

  // Historical data for chosen parameters
  const currentSlotData = useMemo(() => {
    if (!selectedZoneId) return null;
    return baseData.find(
      d => d.location_id === selectedZoneId && d.pickup_dayofweek === selectedDay && d.pickup_hour === selectedHour
    );
  }, [baseData, selectedZoneId, selectedDay, selectedHour]);

  // Simulation calculations based on historical density
  const simulationResults = useMemo(() => {
    const historicalTrips = currentSlotData?.historical_trips || Math.round((selectedZoneObj?.total_trips || 1000) / 168);
    const avgFare = currentSlotData?.avg_revenue_per_trip || selectedZoneObj?.avg_revenue_per_trip || 22.5;

    // Simulation model: marginal return curves
    // Adding N drivers increases served demand, but with dimishing returns
    const capacityPerVehicle = 3.2; // avg trips per vehicle in 1-hour window
    const newSupplyCapacity = additionalVehicles * capacityPerVehicle;

    const estimatedUnmetDemand = Math.round(historicalTrips * 0.28); // estimated baseline unmet demand ratio
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

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Business Decision Simulator</h1>
        <p>
          Simulate operational interventions. &quot;What if we deploy N drivers to Zone X on Friday at 6 PM?&quot;
        </p>
      </div>

      {/* Disclaimer Alert */}
      <div className={styles.disclaimer}>
        <div className={styles.disclaimerIcon}>ⓘ</div>
        <div>
          <strong>Decision Simulation Framework:</strong> Projections rely on historical trip density &amp; empirical marginal return curves.
          Calculations estimate demand fulfillment without dynamic pricing feedback loops.
        </div>
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
