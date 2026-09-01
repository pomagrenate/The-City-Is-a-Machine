'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
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
  FaPlay,
  FaPause,
  FaRedo,
  FaBolt,
  FaTaxi,
  FaSubway,
  FaWater,
  FaShieldAlt,
  FaExclamationTriangle,
  FaLightbulb,
  FaCheckCircle,
  FaMapMarkedAlt,
} from 'react-icons/fa';
import styles from './simulator.module.css';

// ── NYC Spatial Network Topology Definition ──────────────────────────────────
interface NodeDef {
  id: string;
  name: string;
  shortName: string;
  x: number;
  y: number;
  demandWeight: number; // baseline demand weight
  borough: string;
}

const NYC_NODES: Record<string, NodeDef> = {
  upper: { id: 'upper', name: 'Upper Manhattan / Harlem', shortName: 'Upper Manh', x: 220, y: 80, demandWeight: 1.0, borough: 'Manhattan' },
  midtown: { id: 'midtown', name: 'Midtown (Penn & Grand Central)', shortName: 'Midtown Hub', x: 210, y: 170, demandWeight: 3.5, borough: 'Manhattan' },
  financial: { id: 'financial', name: 'Financial District / Wall St', shortName: 'FiDi / Downtown', x: 190, y: 290, demandWeight: 2.2, borough: 'Manhattan' },
  lic: { id: 'lic', name: 'Long Island City (Queens)', shortName: 'Queens LIC', x: 330, y: 150, demandWeight: 1.4, borough: 'Queens' },
  lga: { id: 'lga', name: 'LaGuardia Airport (LGA)', shortName: 'LGA Airport', x: 420, y: 90, demandWeight: 2.0, borough: 'Queens' },
  williamsburg: { id: 'williamsburg', name: 'Williamsburg / DUMBO', shortName: 'Williamsburg', x: 300, y: 260, demandWeight: 1.8, borough: 'Brooklyn' },
  atlantic: { id: 'atlantic', name: 'Atlantic Terminal / Barclays', shortName: 'Atlantic Hub', x: 280, y: 350, demandWeight: 1.9, borough: 'Brooklyn' },
  jfk: { id: 'jfk', name: 'JFK International Airport', shortName: 'JFK Airport', x: 450, y: 340, demandWeight: 2.8, borough: 'Queens' },
};

interface EdgeDef {
  id: string;
  from: string;
  to: string;
  name: string;
  isCrossing: boolean;
}

const NYC_EDGES: EdgeDef[] = [
  { id: 'broadway_north', from: 'upper', to: 'midtown', name: 'Broadway Spine North', isCrossing: false },
  { id: 'broadway_south', from: 'midtown', to: 'financial', name: 'Broadway / 5th Ave Spine', isCrossing: false },
  { id: 'queensboro_bridge', from: 'midtown', to: 'lic', name: 'Queensboro Bridge (59th St)', isCrossing: true },
  { id: 'midtown_tunnel', from: 'midtown', to: 'lic', name: 'Queens-Midtown Tunnel', isCrossing: true },
  { id: 'triborough', from: 'upper', to: 'lga', name: 'RFK Triborough Corridor', isCrossing: true },
  { id: 'grand_central_pkwy', from: 'lic', to: 'lga', name: 'Grand Central Parkway', isCrossing: false },
  { id: 'williamsburg_bridge', from: 'financial', to: 'williamsburg', name: 'Williamsburg Bridge', isCrossing: true },
  { id: 'manhattan_bridge', from: 'financial', to: 'williamsburg', name: 'Manhattan Bridge', isCrossing: true },
  { id: 'brooklyn_bridge', from: 'financial', to: 'atlantic', name: 'Brooklyn Bridge', isCrossing: true },
  { id: 'bqe_corridor', from: 'williamsburg', to: 'atlantic', name: 'Brooklyn-Queens Expressway', isCrossing: false },
  { id: 'van_wyck', from: 'lic', to: 'jfk', name: 'Van Wyck Expressway', isCrossing: false },
  { id: 'belt_pkwy', from: 'atlantic', to: 'jfk', name: 'Belt Parkway Corridor', isCrossing: false },
];

interface Agent {
  id: number;
  fromNode: string;
  toNode: string;
  progress: number;
  speed: number;
  status: 'in_trip' | 'cruising' | 'stuck' | 'dispatched';
  fare: number;
}

export default function SimulatorPage() {
  const [baseData, setBaseData] = useState<SimulatorBase[]>([]);
  const [zones, setZones] = useState<ZoneRevenue[]>([]);
  const [surgeCurve, setSurgeCurve] = useState<SurgeElasticityPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Simulator Tab Navigation ────────────────────────────────────────────────
  const [activePersona, setActivePersona] = useState<'fleet' | 'pricing' | 'disruption'>('fleet');

  // ── Animation Playback State ────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTick, setSimTick] = useState<number>(0);

  // ── Fleet Ops Controls ──────────────────────────────────────────────────────
  const [selectedScenario, setSelectedScenario] = useState<'penn_rain' | 'yankee_egress' | 'lic_starvation'>('penn_rain');
  const [proactiveDispatch, setProactiveDispatch] = useState<boolean>(true);
  const [virtualBatchingHubs, setVirtualBatchingHubs] = useState<boolean>(true);
  const [additionalFleetCount, setAdditionalFleetCount] = useState<number>(600);

  // ── Pricing & Strategy Controls ─────────────────────────────────────────────
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.8);
  const [weatherSeverity, setWeatherSeverity] = useState<'clear' | 'moderate' | 'heavy_storm'>('heavy_storm');
  const [driverIncentiveBonus, setDriverIncentiveBonus] = useState<number>(4.5);

  // ── Disruption Controls ─────────────────────────────────────────────────────
  const [closedCrossings, setClosedCrossings] = useState<Record<string, boolean>>({
    queensboro_bridge: false,
    midtown_tunnel: true, // simulated flooded tunnel
    williamsburg_bridge: false,
  });

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const agentsRef = useRef<Agent[]>([]);

  // Load backend baseline datasets
  useEffect(() => {
    Promise.all([
      getData.simulatorBase().catch(() => []),
      getData.zoneRevenue().catch(() => []),
      getData.surgeElasticityCurve().catch(() => []),
    ]).then(([b, z, s]) => {
      setBaseData(b);
      setZones(z);
      setSurgeCurve(s);
      setLoading(false);
    });
  }, []);

  // Initialize Agents Pool
  useEffect(() => {
    const totalAgents = 140;
    const nodeKeys = Object.keys(NYC_NODES);
    const initialAgents: Agent[] = [];

    for (let i = 0; i < totalAgents; i++) {
      const from = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      let to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      while (to === from) {
        to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      }

      const isTrip = Math.random() > 0.35;
      initialAgents.push({
        id: i,
        fromNode: from,
        toNode: to,
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.004,
        status: isTrip ? 'in_trip' : 'cruising',
        fare: 18 + Math.random() * 25,
      });
    }
    agentsRef.current = initialAgents;
  }, []);

  // Toggle Bridge / Tunnel Closure
  const toggleCrossingClosure = (crossingId: string) => {
    setClosedCrossings(prev => ({
      ...prev,
      [crossingId]: !prev[crossingId],
    }));
  };

  // ── Canvas Animation Loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Network Connections (Edges)
      NYC_EDGES.forEach(edge => {
        const fromNode = NYC_NODES[edge.from];
        const toNode = NYC_NODES[edge.to];
        if (!fromNode || !toNode) return;

        const isClosed = closedCrossings[edge.id];

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);

        if (isClosed) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
        } else if (edge.isCrossing) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // If closed, draw crossing blocked hazard icon
        if (isClosed) {
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(midX, midY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✕', midX, midY);
        }
      });

      // 2. Draw Pulsing Rings on High-Demand / Virtual Hubs
      const pulseTime = Date.now() / 400;
      const pulseRadius = 16 + Math.sin(pulseTime) * 6;

      if (proactiveDispatch) {
        // Pulse at Midtown Hub
        const midtown = NYC_NODES.midtown;
        ctx.beginPath();
        ctx.arc(midtown.x, midtown.y, pulseRadius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (virtualBatchingHubs) {
        // Pulse at Queens LIC & Atlantic Hub
        [NYC_NODES.lic, NYC_NODES.atlantic].forEach(hub => {
          ctx.beginPath();
          ctx.arc(hub.x, hub.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      // 3. Draw Nodes (Hubs & Neighborhoods)
      Object.values(NYC_NODES).forEach(node => {
        // Node halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = node.borough === 'Manhattan' ? '#1e293b' : '#0f172a';
        ctx.fill();
        ctx.strokeStyle = node.id === 'midtown' ? '#38bdf8' : '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node dot center
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.id === 'midtown' ? '#38bdf8' : '#94a3b8';
        ctx.fill();

        // Node label
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(node.shortName, node.x, node.y - 14);
      });

      // 4. Update and Draw Moving Taxi Agents
      const agents = agentsRef.current;
      const nodeKeys = Object.keys(NYC_NODES);

      agents.forEach(agent => {
        if (isPlaying) {
          // Adjust speed based on weather and bridge closure
          let currentSpeed = agent.speed * simSpeed;
          if (weatherSeverity === 'heavy_storm') currentSpeed *= 0.65;

          // Check if path uses a closed crossing
          const pathEdge = NYC_EDGES.find(
            e => (e.from === agent.fromNode && e.to === agent.toNode) || (e.from === agent.toNode && e.to === agent.fromNode)
          );
          if (pathEdge && closedCrossings[pathEdge.id]) {
            agent.status = 'stuck';
            currentSpeed *= 0.15; // heavily delayed
          } else if (proactiveDispatch && agent.toNode === 'midtown') {
            agent.status = 'dispatched';
          }

          agent.progress += currentSpeed;

          // When reached destination, pick new destination
          if (agent.progress >= 1) {
            agent.progress = 0;
            agent.fromNode = agent.toNode;

            // Weighted destination picking: Midtown gets higher weight during storm
            if (selectedScenario === 'penn_rain' && Math.random() < 0.5) {
              agent.toNode = 'midtown';
            } else if (selectedScenario === 'lic_starvation' && Math.random() < 0.4) {
              agent.toNode = 'lic';
            } else {
              let nextNode = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
              while (nextNode === agent.fromNode) {
                nextNode = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
              }
              agent.toNode = nextNode;
            }

            // Probability of picking up a passenger based on surge
            const pickupProb = surgeMultiplier > 2.2 ? 0.35 : (surgeMultiplier >= 1.6 ? 0.82 : 0.70);
            agent.status = Math.random() < pickupProb ? 'in_trip' : 'cruising';
          }
        }

        const from = NYC_NODES[agent.fromNode];
        const to = NYC_NODES[agent.toNode];
        if (!from || !to) return;

        // Current coordinates
        const curX = from.x + (to.x - from.x) * agent.progress;
        const curY = from.y + (to.y - from.y) * agent.progress;

        // Color based on status
        let dotColor = '#eab308'; // yellow cruising
        if (agent.status === 'in_trip') dotColor = '#22c55e'; // green with passenger
        if (agent.status === 'stuck') dotColor = '#ef4444'; // red stuck
        if (agent.status === 'dispatched') dotColor = '#38bdf8'; // cyan proactive dispatch

        ctx.beginPath();
        ctx.arc(curX, curY, agent.status === 'in_trip' ? 3.5 : 2.8, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      if (isPlaying) {
        setSimTick(t => t + 1);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, simSpeed, selectedScenario, proactiveDispatch, virtualBatchingHubs, surgeMultiplier, weatherSeverity, closedCrossings]);

  // ── Calculated Real-Time Metrics ──────────────────────────────────────────
  const liveMetrics = useMemo(() => {
    // Baseline trips & revenue
    const baselineTrips = 14500;
    const baseFare = 22.50;

    // Surge impact
    const surgeFactor = surgeMultiplier;
    let conversionRate = Math.max(12, Math.min(95, 95 - Math.pow(surgeFactor - 1.0, 1.8) * 35));
    if (weatherSeverity === 'heavy_storm') conversionRate += 8; // higher tolerance in storm

    const completedTrips = Math.round(baselineTrips * (conversionRate / 100) * (proactiveDispatch ? 1.22 : 1.0));
    const effectiveAvgFare = baseFare * surgeFactor;
    const totalGmv = completedTrips * effectiveAvgFare;
    const platformTakeRate = 0.20;
    const platformRevenue = totalGmv * platformTakeRate;

    // Subsidy & Operational ROI
    const dispatchSubsidyCost = proactiveDispatch ? additionalFleetCount * 3.50 : 0;
    const grossRevenueUplift = proactiveDispatch ? (completedTrips - baselineTrips * 0.75) * effectiveAvgFare : 0;
    const operationalRoi = dispatchSubsidyCost > 0 ? (grossRevenueUplift / dispatchSubsidyCost) : 0;

    // Customer Wait Time & Disruption Delay
    let avgWaitTimeMin = proactiveDispatch ? 7.8 : 26.5;
    if (closedCrossings.queensboro_bridge || closedCrossings.midtown_tunnel) {
      avgWaitTimeMin += 8.5;
    }
    if (virtualBatchingHubs) {
      avgWaitTimeMin = Math.max(5.5, avgWaitTimeMin * 0.55);
    }

    const deadheadReductionPct = proactiveDispatch ? 34.5 : 0;
    const fulfillmentRatePct = Math.min(96.5, (completedTrips / baselineTrips) * 100);

    return {
      conversionRate,
      completedTrips,
      totalGmv,
      platformRevenue,
      dispatchSubsidyCost,
      grossRevenueUplift,
      operationalRoi,
      avgWaitTimeMin,
      deadheadReductionPct,
      fulfillmentRatePct,
    };
  }, [surgeMultiplier, weatherSeverity, proactiveDispatch, virtualBatchingHubs, additionalFleetCount, closedCrossings]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>The City Machine Arena — Live Fleet &amp; Pricing Simulator</h1>
        <p>
          Trình giả lập vận hành mạng lưới taxi thời gian thực kết hợp giữa <strong>Bản đồ hạt chuyển động (Agent-based Grid Map)</strong> và <strong>Đấu trường điều khiển đa kịch bản</strong>.
        </p>
      </div>

      {/* ── Role & Persona Switcher ────────────────────────────────────────── */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activePersona === 'fleet' ? styles.tabButtonActive : ''}`}
          onClick={() => setActivePersona('fleet')}
        >
          <FaTaxi /> 1. Điều Phối Đội Xe (Fleet Operations &amp; Dispatch)
        </button>
        <button
          className={`${styles.tabButton} ${activePersona === 'pricing' ? styles.tabButtonActive : ''}`}
          onClick={() => setActivePersona('pricing')}
        >
          <FaBolt /> 2. Đấu Trường Surge Pricing &amp; Điểm Gãy Cầu (Pricing Arena)
        </button>
        <button
          className={`${styles.tabButton} ${activePersona === 'disruption' ? styles.tabButtonActive : ''}`}
          onClick={() => setActivePersona('disruption')}
        >
          <FaWater /> 3. Ứng Phó Thiên Tai &amp; Phong Tỏa Cầu Đường (Disruption SOP)
        </button>
      </div>

      {/* ── Main Arena Dual-Screen Layout ──────────────────────────────────── */}
      <div className={styles.arenaLayout}>
        {/* LEFT COLUMN: LIVE CANVAS GRID MAP */}
        <div className={styles.canvasCard}>
          <div className={styles.canvasHeader}>
            <div className={styles.canvasTitle}>
              <FaMapMarkedAlt color="var(--color-blue)" /> NYC Spatial Agent-Based Grid Simulation
            </div>
            <div className={styles.canvasSubtitle}>
              {isPlaying ? '● LIVE ENGINE RUNNING' : '❚❚ PAUSED'} ({agentsRef.current.length} Active Vehicles)
            </div>
          </div>

          <div className={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              width={520}
              height={420}
              className={styles.canvasElement}
            />
          </div>

          {/* Playback Control Bar */}
          <div className={styles.playbackBar}>
            <div className={styles.playbackControls}>
              <button
                className={`${styles.controlBtn} ${isPlaying ? styles.controlBtnActive : ''}`}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <><FaPause /> Tạm Dừng</> : <><FaPlay /> Tiếp Tục</>}
              </button>
              <button
                className={`${styles.controlBtn} ${simSpeed === 1 ? styles.controlBtnActive : ''}`}
                onClick={() => setSimSpeed(1)}
              >
                1×
              </button>
              <button
                className={`${styles.controlBtn} ${simSpeed === 2 ? styles.controlBtnActive : ''}`}
                onClick={() => setSimSpeed(2)}
              >
                2×
              </button>
              <button
                className={`${styles.controlBtn} ${simSpeed === 4 ? styles.controlBtnActive : ''}`}
                onClick={() => setSimSpeed(4)}
              >
                4× Speed
              </button>
            </div>

            <div style={{ color: '#94a3b8' }}>
              Tick: <strong>{simTick}</strong>
            </div>
          </div>

          {/* Map Legend */}
          <div className={styles.legendBar}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#22c55e' }} />
              <span>Đang chở khách (In-Trip)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#eab308' }} />
              <span>Chạy rỗng tìm khách (Cruising)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#ef4444' }} />
              <span>Kẹt cầu / Ngập đường (Stuck)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#38bdf8' }} />
              <span>Dẫn dòng đón đầu (Dispatched)</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SCENARIO & PARAMETER COCKPIT */}
        <div className={styles.panelCard}>
          {/* ── TAB 1: FLEET OPS COCKPIT ── */}
          {activePersona === 'fleet' && (
            <>
              <div className={styles.panelTitle}>
                <FaTaxi color="var(--color-blue)" /> Fleet Ops &amp; Dispatch Cockpit
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>1. Kịch Bản Vận Hành Cần Mô Phỏng</label>
                <select
                  className={styles.select}
                  value={selectedScenario}
                  onChange={e => setSelectedScenario(e.target.value as any)}
                >
                  <option value="penn_rain">Sự Cố Tan Tầm Mưa Bão tại Penn Station</option>
                  <option value="lic_starvation">Đói Xe Vùng Giáp Ranh Long Island City</option>
                  <option value="yankee_egress">Tan Trận Sân Vận Động Yankee Egress</option>
                </select>
              </div>

              {/* Toggle Proactive Dispatch */}
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>Dẫn Dòng Chủ Động (Proactive Dispatch)</span>
                  <span className={styles.toggleSub}>Gợi ý gom xe đón đầu trước 20 phút kèm bù xăng $3.50/xe</span>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={proactiveDispatch}
                    onChange={e => setProactiveDispatch(e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              {/* Toggle Virtual Hubs */}
              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>Sảnh Đón Ảo (Virtual Batching Hubs)</span>
                  <span className={styles.toggleSub}>Gom khách tại sảnh khô ráo, xuất xe theo lô 1 chiều</span>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={virtualBatchingHubs}
                    onChange={e => setVirtualBatchingHubs(e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              {/* Additional Fleet Slider */}
              <div className={styles.formGroup}>
                <div className={styles.rangeHeader}>
                  <label className={styles.label}>Số Xe Tái Điều Phối Bổ Sung</label>
                  <span className={styles.rangeValue}>+{additionalFleetCount} xe</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={additionalFleetCount}
                  onChange={e => setAdditionalFleetCount(Number(e.target.value))}
                  className={styles.range}
                />
                <div className={styles.rangeScale}>
                  <span>+100</span>
                  <span>+600</span>
                  <span>+1,500 xe</span>
                </div>
              </div>

              {/* Fleet Ops KPI Summary */}
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Thời Gian Chờ (ETA)</div>
                  <div className={styles.kpiValue} style={{ color: proactiveDispatch ? 'var(--color-green)' : 'var(--color-red)' }}>
                    {liveMetrics.avgWaitTimeMin.toFixed(1)}p
                  </div>
                  <div className={styles.kpiSub}>{proactiveDispatch ? 'Giảm -68% so với tự do' : 'Khách chờ lâu dưới mưa'}</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Tỷ Lệ Đáp Ứng Cuốc</div>
                  <div className={styles.kpiValue} style={{ color: 'var(--color-blue)' }}>
                    {liveMetrics.fulfillmentRatePct.toFixed(1)}%
                  </div>
                  <div className={styles.kpiSub}>{formatNumber(liveMetrics.completedTrips)} cuốc hoàn thành</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Giảm Chạy Rỗng (Deadhead)</div>
                  <div className={styles.kpiValue} style={{ color: 'var(--color-purple)' }}>
                    -{liveMetrics.deadheadReductionPct.toFixed(1)}%
                  </div>
                  <div className={styles.kpiSub}>Nhờ gom chuyến khứ hồi</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>ROI Bù Xăng Điều Phối</div>
                  <div className={styles.kpiValue} style={{ color: 'var(--color-green)' }}>
                    {liveMetrics.operationalRoi.toFixed(1)}×
                  </div>
                  <div className={styles.kpiSub}>Chi ${formatNumber(liveMetrics.dispatchSubsidyCost)} thu +{formatCurrency(liveMetrics.grossRevenueUplift)}</div>
                </div>
              </div>

              <div className={styles.recommendationCard}>
                <div className={styles.recommendationTitle}>
                  <FaCheckCircle /> Khuyến Nghị Ban Điều Hành Đội Xe:
                </div>
                <p className={styles.recommendationText}>
                  Kích hoạt <strong>Proactive Dispatch đón đầu</strong> kết hợp <strong>Sảnh đón ảo (Batching Hubs)</strong> giúp giải tỏa ga tàu nhanh hơn <strong>64%</strong>, biến thời gian chờ từ 26.5 phút xuống <strong>7.8 phút</strong> và thu lại <strong>{liveMetrics.operationalRoi.toFixed(1)}×</strong> giá trị đầu tư chi phí hỗ trợ xăng xe.
                </p>
              </div>
            </>
          )}

          {/* ── TAB 2: PRICING STRATEGY COCKPIT ── */}
          {activePersona === 'pricing' && (
            <>
              <div className={styles.panelTitle}>
                <FaBolt color="var(--color-blue)" /> Pricing &amp; Chief Strategy Arena
              </div>

              <div className={styles.formGroup}>
                <div className={styles.rangeHeader}>
                  <label className={styles.label}>Hệ Số Giá Surge ($P_{'{'}rider{'}'}$)</label>
                  <span className={styles.rangeValue} style={{ fontSize: '1.2rem', color: surgeMultiplier > 2.0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                    {surgeMultiplier.toFixed(1)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  value={surgeMultiplier}
                  onChange={e => setSurgeMultiplier(Number(e.target.value))}
                  className={styles.range}
                />
                <div className={styles.rangeScale}>
                  <span>1.0×</span>
                  <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>★ 1.8× Sweet Spot</span>
                  <span style={{ color: 'var(--color-red)' }}>3.0× Kẹt Thanh Khoản</span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Điều Kiện Thời Tiết Đang Áp Dụng</label>
                <select
                  className={styles.select}
                  value={weatherSeverity}
                  onChange={e => setWeatherSeverity(e.target.value as any)}
                >
                  <option value="clear">Trời Quang (Nhu cầu chuẩn)</option>
                  <option value="moderate">Mưa Vừa (Nhu cầu tăng 1.4×)</option>
                  <option value="heavy_storm">Mưa Bão Ngập Lụt (Nhu cầu tăng 2.3×)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.rangeHeader}>
                  <label className={styles.label}>Thưởng Thời Tiết Cho Tài Xế ($P_{'{'}driver{'}'}$ Split-Bonus)</label>
                  <span className={styles.rangeValue}>+${driverIncentiveBonus.toFixed(2)}/cuốc</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={driverIncentiveBonus}
                  onChange={e => setDriverIncentiveBonus(Number(e.target.value))}
                  className={styles.range}
                />
              </div>

              {/* Pricing Real-time KPIs */}
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Tổng GMV Giao Dịch</div>
                  <div className={styles.kpiValue} style={{ color: surgeMultiplier <= 1.8 ? 'var(--color-green)' : 'var(--color-red)' }}>
                    {formatCurrency(liveMetrics.totalGmv)}
                  </div>
                  <div className={styles.kpiSub}>Thu phí sàn: {formatCurrency(liveMetrics.platformRevenue)}</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>Tỷ Lệ Chốt Cuốc (Conversion)</div>
                  <div className={styles.kpiValue} style={{ color: liveMetrics.conversionRate > 50 ? 'var(--color-blue)' : 'var(--color-red)' }}>
                    {liveMetrics.conversionRate.toFixed(1)}%
                  </div>
                  <div className={styles.kpiSub}>{surgeMultiplier > 2.0 ? 'Khách bỏ app vì giá phi lý' : 'Thanh khoản tốt'}</div>
                </div>
              </div>

              {surgeMultiplier > 2.0 ? (
                <div className={styles.recommendationWarning}>
                  <div className={styles.recommendationTitleWarning}>
                    <FaExclamationTriangle /> Cảnh Báo: Rơi Vào Bẫy Kẹt Thanh Khoản (Liquidity Deadlock)
                  </div>
                  <p className={styles.recommendationText}>
                    Khi Surge đạt <strong>{surgeMultiplier.toFixed(1)}×</strong>, khách hàng bỏ app tới <strong>{(100 - liveMetrics.conversionRate).toFixed(0)}%</strong>. Tài xế kéo đến khu vực nhưng đứng chờ rỗng (Idle Time 35p). Khuyến nghị khóa trần Surge thông minh ở mức <strong>1.8×</strong>.
                  </p>
                </div>
              ) : (
                <div className={styles.recommendationCard}>
                  <div className={styles.recommendationTitle}>
                    <FaCheckCircle /> Điểm Cân Bằng Tối Ưu GMV (Sweet Spot):
                  </div>
                  <p className={styles.recommendationText}>
                    Hệ số <strong>{surgeMultiplier.toFixed(1)}×</strong> giữ tỷ lệ chốt cuốc ở mức <strong>{liveMetrics.conversionRate.toFixed(1)}%</strong>, tối đa hóa tổng giá trị GMV sàn đạt <strong>{formatCurrency(liveMetrics.totalGmv)}</strong>.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── TAB 3: DISRUPTION & INFRASTRUCTURE ── */}
          {activePersona === 'disruption' && (
            <>
              <div className={styles.panelTitle}>
                <FaWater color="var(--color-blue)" /> Infrastructure Disruption &amp; Flood SOP
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Nhấn vào các nút bên dưới để mô phỏng tình huống phong tỏa cầu / hầm do ngập lụt và theo dõi dòng xe chuyển hướng trên bản đồ:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(closedCrossings).map(([crossingId, isClosed]) => {
                  const edge = NYC_EDGES.find(e => e.id === crossingId);
                  return (
                    <button
                      key={crossingId}
                      onClick={() => toggleCrossingClosure(crossingId)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: isClosed ? '2px solid #ef4444' : '1px solid var(--color-border)',
                        background: isClosed ? '#fee2e2' : 'var(--color-bg)',
                        color: isClosed ? '#b91c1c' : 'var(--color-text-primary)',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'left',
                      }}
                    >
                      <span>{edge?.name || crossingId}</span>
                      <span>{isClosed ? '⛔ ĐANG ĐÓNG (Ngập Nước)' : '🟢 HOẠT ĐỘNG'}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.recommendationCard}>
                <div className={styles.recommendationTitle}>
                  <FaShieldAlt /> Quy Trình Ứng Phó Khẩn Cấp (Flood SOP):
                </div>
                <p className={styles.recommendationText}>
                  Khi Hầm Midtown bị ngập, toàn bộ lưu lượng xe dồn qua Cầu Queensboro và Williamsburg làm tăng <strong>+8.5 phút</strong> thời gian tiếp cận. Kích hoạt <strong>Micro-Hubs tại Queens LIC</strong> giúp giải tỏa khách qua phà và đường sắt mà không làm tê liệt đường bộ.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


