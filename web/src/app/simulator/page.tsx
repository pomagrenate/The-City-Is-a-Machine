'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type { SimulatorBase, ZoneRevenue, SurgeElasticityPoint } from '@/types';
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
  FaPlay,
  FaPause,
  FaBolt,
  FaTaxi,
  FaWater,
  FaExclamationTriangle,
  FaLightbulb,
  FaCheckCircle,
  FaMapMarkedAlt,
  FaBatteryHalf,
  FaGasPump,
  FaMoneyBillWave,
  FaTrafficLight,
  FaMusic,
} from 'react-icons/fa';
import styles from './simulator.module.css';

// ── NYC Spatial Network Topology Definition ──────────────────────────────────
interface NodeDef {
  id: string;
  name: string;
  shortName: string;
  x: number;
  y: number;
  baseDemand: number;
  borough: string;
}

const NYC_NODES: Record<string, NodeDef> = {
  upper: { id: 'upper', name: 'Upper Manhattan / Harlem', shortName: 'Upper Manh', x: 220, y: 75, baseDemand: 120, borough: 'Manhattan' },
  midtown: { id: 'midtown', name: 'Midtown (Penn & Grand Central & MSG)', shortName: 'Midtown Hub', x: 210, y: 165, baseDemand: 450, borough: 'Manhattan' },
  financial: { id: 'financial', name: 'Financial District / Wall St', shortName: 'FiDi / Downtown', x: 190, y: 285, baseDemand: 260, borough: 'Manhattan' },
  lic: { id: 'lic', name: 'Long Island City (Queens)', shortName: 'Queens LIC', x: 330, y: 145, baseDemand: 180, borough: 'Queens' },
  lga: { id: 'lga', name: 'LaGuardia Airport (LGA)', shortName: 'LGA Airport', x: 420, y: 85, baseDemand: 220, borough: 'Queens' },
  williamsburg: { id: 'williamsburg', name: 'Williamsburg / DUMBO', shortName: 'Williamsburg', x: 300, y: 255, baseDemand: 210, borough: 'Brooklyn' },
  atlantic: { id: 'atlantic', name: 'Atlantic Terminal / Barclays Center', shortName: 'Atlantic Hub', x: 280, y: 345, baseDemand: 240, borough: 'Brooklyn' },
  jfk: { id: 'jfk', name: 'JFK International Airport', shortName: 'JFK Airport', x: 450, y: 335, baseDemand: 320, borough: 'Queens' },
};

interface EdgeDef {
  id: string;
  from: string;
  to: string;
  name: string;
  isCrossing: boolean;
  baseSpeed: number; // in mph
}

const NYC_EDGES: EdgeDef[] = [
  { id: 'broadway_north', from: 'upper', to: 'midtown', name: 'Broadway Spine North', isCrossing: false, baseSpeed: 12 },
  { id: 'broadway_south', from: 'midtown', to: 'financial', name: 'Broadway / 5th Ave Spine', isCrossing: false, baseSpeed: 8 },
  { id: 'queensboro_bridge', from: 'midtown', to: 'lic', name: 'Queensboro Bridge (59th St)', isCrossing: true, baseSpeed: 16 },
  { id: 'midtown_tunnel', from: 'midtown', to: 'lic', name: 'Queens-Midtown Tunnel', isCrossing: true, baseSpeed: 18 },
  { id: 'triborough', from: 'upper', to: 'lga', name: 'RFK Triborough Corridor', isCrossing: true, baseSpeed: 24 },
  { id: 'grand_central_pkwy', from: 'lic', to: 'lga', name: 'Grand Central Parkway', isCrossing: false, baseSpeed: 22 },
  { id: 'williamsburg_bridge', from: 'financial', to: 'williamsburg', name: 'Williamsburg Bridge', isCrossing: true, baseSpeed: 15 },
  { id: 'manhattan_bridge', from: 'financial', to: 'williamsburg', name: 'Manhattan Bridge', isCrossing: true, baseSpeed: 16 },
  { id: 'brooklyn_bridge', from: 'financial', to: 'atlantic', name: 'Brooklyn Bridge', isCrossing: true, baseSpeed: 14 },
  { id: 'bqe_corridor', from: 'williamsburg', to: 'atlantic', name: 'Brooklyn-Queens Expressway', isCrossing: false, baseSpeed: 18 },
  { id: 'van_wyck', from: 'lic', to: 'jfk', name: 'Van Wyck Expressway', isCrossing: false, baseSpeed: 25 },
  { id: 'belt_pkwy', from: 'atlantic', to: 'jfk', name: 'Belt Parkway Corridor', isCrossing: false, baseSpeed: 28 },
];

interface Agent {
  id: number;
  fromNode: string;
  toNode: string;
  progress: number;
  speed: number;
  status: 'in_trip' | 'cruising' | 'stuck' | 'dispatched' | 'offline';
  stamina: number; // 0 to 100
  profile: 'risk_seeking' | 'risk_averse' | 'local';
  fare: number;
}

export default function SimulatorPage() {
  const [baseData, setBaseData] = useState<SimulatorBase[]>([]);
  const [zones, setZones] = useState<ZoneRevenue[]>([]);
  const [surgeCurve, setSurgeCurve] = useState<SurgeElasticityPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Simulator Tab Navigation ────────────────────────────────────────────────
  const [activePersona, setActivePersona] = useState<'fleet' | 'pricing' | 'fatigue' | 'micro_surge'>('fleet');

  // ── Animation Playback State ────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTick, setSimTick] = useState<number>(0);

  // ── Urban Shock State ───────────────────────────────────────────────────────
  const [activeShock, setActiveShock] = useState<'none' | 'msg_concert' | 'lincoln_accident' | 'gas_price_spike' | 'flash_flood'>('none');

  // ── Cumulative Shadow Lost Revenue Ticker ───────────────────────────────────
  const [cumulativeLostRevenue, setCumulativeLostRevenue] = useState<number>(2840.0);

  // ── Fleet Ops Controls ──────────────────────────────────────────────────────
  const [selectedScenario, setSelectedScenario] = useState<'penn_rain' | 'yankee_egress' | 'lic_starvation'>('penn_rain');
  const [proactiveDispatch, setProactiveDispatch] = useState<boolean>(true);
  const [virtualBatchingHubs, setVirtualBatchingHubs] = useState<boolean>(true);
  const [additionalFleetCount, setAdditionalFleetCount] = useState<number>(600);

  // ── Pricing & Strategy Controls ─────────────────────────────────────────────
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.8);
  const [weatherSeverity, setWeatherSeverity] = useState<'clear' | 'moderate' | 'heavy_storm'>('heavy_storm');
  const [driverIncentiveBonus, setDriverIncentiveBonus] = useState<number>(4.5);

  // ── Driver Fatigue & Jam Subsidy Controls ───────────────────────────────────
  const [trafficJamSubsidy, setTrafficJamSubsidy] = useState<number>(4.0);

  // ── Micro-Surge & Route Acceptance Controls ─────────────────────────────────
  const [selectedRouteKey, setSelectedRouteKey] = useState<string>('midtown_lic');
  const [hazardSurcharge, setHazardSurcharge] = useState<number>(3.50);

  // ── Disruption Crossings State ──────────────────────────────────────────────
  const [closedCrossings, setClosedCrossings] = useState<Record<string, boolean>>({
    queensboro_bridge: false,
    midtown_tunnel: true,
    williamsburg_bridge: false,
  });

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

  // Initialize Stochastic Agents Pool
  useEffect(() => {
    const totalAgents = 150;
    const nodeKeys = Object.keys(NYC_NODES);
    const initialAgents: Agent[] = [];

    for (let i = 0; i < totalAgents; i++) {
      const from = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      let to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      while (to === from) {
        to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      }

      const profileRand = Math.random();
      const profile: Agent['profile'] = profileRand < 0.35 ? 'risk_seeking' : (profileRand < 0.80 ? 'risk_averse' : 'local');
      const isTrip = Math.random() > 0.35;

      initialAgents.push({
        id: i,
        fromNode: from,
        toNode: to,
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.004,
        status: isTrip ? 'in_trip' : 'cruising',
        stamina: 75 + Math.random() * 25,
        profile,
        fare: 18 + Math.random() * 25,
      });
    }
    agentsRef.current = initialAgents;
  }, []);

  // ── Canvas Live Animation Loop (Light Theme) ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Light background fill
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Light background grid lines
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 1. Draw Network Connections (Edges)
      NYC_EDGES.forEach(edge => {
        const fromNode = NYC_NODES[edge.from];
        const toNode = NYC_NODES[edge.to];
        if (!fromNode || !toNode) return;

        const isClosed = closedCrossings[edge.id];
        const isShocked = (activeShock === 'lincoln_accident' && edge.id === 'broadway_south') ||
                          (activeShock === 'flash_flood' && edge.isCrossing);

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);

        if (isClosed || isShocked) {
          ctx.strokeStyle = isClosed ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
        } else if (edge.isCrossing) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (isClosed || isShocked) {
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          ctx.fillStyle = isClosed ? '#ef4444' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(midX, midY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isClosed ? '✕' : '!', midX, midY);
        }
      });

      // 2. Draw Pulsing Rings on High-Demand / Virtual Hubs / Shocks
      const pulseTime = Date.now() / 400;
      const pulseRadius = 16 + Math.sin(pulseTime) * 6;

      if (proactiveDispatch) {
        const midtown = NYC_NODES.midtown;
        ctx.beginPath();
        ctx.arc(midtown.x, midtown.y, pulseRadius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (activeShock === 'msg_concert') {
        const midtown = NYC_NODES.midtown;
        ctx.beginPath();
        ctx.arc(midtown.x, midtown.y, pulseRadius + 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      if (virtualBatchingHubs) {
        [NYC_NODES.lic, NYC_NODES.atlantic].forEach(hub => {
          ctx.beginPath();
          ctx.arc(hub.x, hub.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }

      // 3. Draw Nodes (Hubs & Neighborhoods)
      Object.values(NYC_NODES).forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = node.id === 'midtown' ? (activeShock === 'msg_concert' ? '#ef4444' : '#2563eb') : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = node.id === 'midtown' ? '#2563eb' : '#64748b';
        ctx.fill();

        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText(node.shortName, node.x, node.y - 15);
      });

      // 4. Update and Draw Moving Taxi Agents
      const agents = agentsRef.current;
      const nodeKeys = Object.keys(NYC_NODES);

      agents.forEach(agent => {
        if (agent.status === 'offline') return;

        if (isPlaying) {
          let currentSpeed = agent.speed * simSpeed;
          if (weatherSeverity === 'heavy_storm') currentSpeed *= 0.65;
          if (activeShock === 'gas_price_spike') currentSpeed *= 0.85;

          const pathEdge = NYC_EDGES.find(
            e => (e.from === agent.fromNode && e.to === agent.toNode) || (e.from === agent.toNode && e.to === agent.fromNode)
          );

          if (pathEdge && (closedCrossings[pathEdge.id] || (activeShock === 'flash_flood' && pathEdge.isCrossing))) {
            agent.status = 'stuck';
            currentSpeed *= 0.15;
            const staminaDrain = Math.max(0.02, 0.08 - trafficJamSubsidy * 0.012);
            agent.stamina = Math.max(0, agent.stamina - staminaDrain * simSpeed);
          } else if (proactiveDispatch && agent.toNode === 'midtown') {
            agent.status = 'dispatched';
            agent.stamina = Math.min(100, agent.stamina + 0.01 * simSpeed);
          } else if (agent.status === 'cruising') {
            const staminaDrain = Math.max(0.01, 0.04 - trafficJamSubsidy * 0.006);
            agent.stamina = Math.max(0, agent.stamina - staminaDrain * simSpeed);
          }

          if (agent.stamina <= 0) {
            agent.status = 'offline';
          }

          agent.progress += currentSpeed;

          if (agent.progress >= 1) {
            agent.progress = 0;
            agent.fromNode = agent.toNode;

            if ((selectedScenario === 'penn_rain' || activeShock === 'msg_concert') && Math.random() < 0.55) {
              agent.toNode = 'midtown';
            } else if (selectedScenario === 'lic_starvation' && Math.random() < 0.45) {
              agent.toNode = 'lic';
            } else {
              let nextNode = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
              while (nextNode === agent.fromNode) {
                nextNode = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
              }
              agent.toNode = nextNode;
            }

            const pickupProb = surgeMultiplier > 2.2 ? 0.32 : (surgeMultiplier >= 1.6 ? 0.84 : 0.72);
            agent.status = Math.random() < pickupProb ? 'in_trip' : 'cruising';
            if (agent.status === 'in_trip') {
              agent.stamina = Math.min(100, agent.stamina + 3.0);
            }
          }
        }

        const from = NYC_NODES[agent.fromNode];
        const to = NYC_NODES[agent.toNode];
        if (!from || !to) return;

        const curX = from.x + (to.x - from.x) * agent.progress;
        const curY = from.y + (to.y - from.y) * agent.progress;

        let dotColor = '#f59e0b'; // cruising amber
        if (agent.status === 'in_trip') dotColor = '#10b981'; // in-trip green
        if (agent.status === 'stuck') dotColor = '#ef4444'; // stuck red
        if (agent.status === 'dispatched') dotColor = '#2563eb'; // proactive blue

        ctx.beginPath();
        ctx.arc(curX, curY, agent.status === 'in_trip' ? 3.5 : 2.8, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (agent.stamina < 30) {
          ctx.beginPath();
          ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      if (isPlaying) {
        setSimTick(t => t + 1);
        if (!proactiveDispatch || surgeMultiplier > 2.2) {
          setCumulativeLostRevenue(prev => prev + (0.45 * simSpeed));
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, simSpeed, selectedScenario, activeShock, proactiveDispatch, virtualBatchingHubs, surgeMultiplier, weatherSeverity, trafficJamSubsidy, closedCrossings]);

  // ── Calculated Real-Time Metrics ──────────────────────────────────────────
  const liveMetrics = useMemo(() => {
    const baselineTrips = 14500;
    const baseFare = 22.50;

    const surgeFactor = surgeMultiplier;
    let conversionRate = Math.max(12, Math.min(95, 95 - Math.pow(surgeFactor - 1.0, 1.8) * 35));
    if (weatherSeverity === 'heavy_storm') conversionRate += 8;
    if (activeShock === 'msg_concert') conversionRate -= 6;

    const completedTrips = Math.round(baselineTrips * (conversionRate / 100) * (proactiveDispatch ? 1.22 : 1.0));
    const effectiveAvgFare = baseFare * surgeFactor;
    const totalGmv = completedTrips * effectiveAvgFare;
    const platformTakeRate = 0.20;
    const platformRevenue = totalGmv * platformTakeRate;

    const dispatchSubsidyCost = proactiveDispatch ? additionalFleetCount * 3.50 : 0;
    const grossRevenueUplift = proactiveDispatch ? (completedTrips - baselineTrips * 0.75) * effectiveAvgFare : 0;
    const operationalRoi = dispatchSubsidyCost > 0 ? (grossRevenueUplift / dispatchSubsidyCost) : 0;

    let avgWaitTimeMin = proactiveDispatch ? 7.8 : 26.5;
    if (closedCrossings.queensboro_bridge || closedCrossings.midtown_tunnel || activeShock === 'lincoln_accident') {
      avgWaitTimeMin += 8.5;
    }
    if (virtualBatchingHubs) {
      avgWaitTimeMin = Math.max(5.5, avgWaitTimeMin * 0.55);
    }

    const totalAgents = agentsRef.current.length || 150;
    const onlineAgents = agentsRef.current.filter(a => a.status !== 'offline').length || 135;
    const fleetOnlinePct = Math.round((onlineAgents / totalAgents) * 100);
    const avgStamina = Math.round(agentsRef.current.reduce((s, a) => s + a.stamina, 0) / totalAgents) || 72;

    const routeBaselineDuration = selectedRouteKey === 'midtown_lic' ? 32 : (selectedRouteKey === 'fidi_jfk' ? 48 : 24);
    const routeBaselineFare = selectedRouteKey === 'midtown_lic' ? 28.5 : (selectedRouteKey === 'fidi_jfk' ? 62.0 : 21.0);
    const expectedYieldPerMin = (routeBaselineFare + hazardSurcharge) / (routeBaselineDuration + (weatherSeverity === 'heavy_storm' ? 12 : 4));
    const routeAcceptanceRate = Math.min(95, Math.max(25, Math.round((1 / (1 + Math.exp(-6 * (expectedYieldPerMin - 0.55)))) * 100)));

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
      fleetOnlinePct,
      onlineAgents,
      totalAgents,
      avgStamina,
      expectedYieldPerMin,
      routeAcceptanceRate,
    };
  }, [surgeMultiplier, weatherSeverity, proactiveDispatch, virtualBatchingHubs, additionalFleetCount, closedCrossings, activeShock, selectedRouteKey, hazardSurcharge]);

  return (
    <div className="page-content">
      <div className={styles.container}>
        {/* ── Header ── */}
        <div className="page-header">
          <h1>The City Machine Arena — Spatial Fleet &amp; Pricing Simulator</h1>
          <p>
            Real-time stochastic agent-based modeling of urban mobility supply-demand equilibria, surge price elasticity, driver stamina churn, and infrastructure disruption response.
          </p>
        </div>

        {/* ── TOP LIVE SHADOW LOST REVENUE TICKER ── */}
        <div className={styles.lostRevenueCard}>
          <div className={styles.lostRevenueHeader}>
            <div className={styles.lostRevenueIconBox}>
              <FaMoneyBillWave size={22} />
            </div>
            <div>
              <div className={styles.lostRevenueTitle}>
                Cumulative Shadow Lost Revenue Radar
              </div>
              <div className={styles.lostRevenueSubtitle}>
                Estimated uncaptured Gross Merchandise Value (GMV) due to localized supply deficits &amp; customer abandonment
              </div>
            </div>
          </div>
          <div className={styles.lostRevenueValue}>
            -${formatNumber(Math.round(cumulativeLostRevenue))} USD
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${activePersona === 'fleet' ? styles.tabButtonActive : ''}`}
            onClick={() => setActivePersona('fleet')}
          >
            <FaTaxi /> 1. Fleet Operations &amp; Dispatch
          </button>
          <button
            className={`${styles.tabButton} ${activePersona === 'pricing' ? styles.tabButtonActive : ''}`}
            onClick={() => setActivePersona('pricing')}
          >
            <FaBolt /> 2. Surge Pricing &amp; Demand Evaporation
          </button>
          <button
            className={`${styles.tabButton} ${activePersona === 'fatigue' ? styles.tabButtonActive : ''}`}
            onClick={() => setActivePersona('fatigue')}
          >
            <FaBatteryHalf /> 3. Driver Fatigue &amp; Jam Subsidy
          </button>
          <button
            className={`${styles.tabButton} ${activePersona === 'micro_surge' ? styles.tabButtonActive : ''}`}
            onClick={() => setActivePersona('micro_surge')}
          >
            <FaTrafficLight /> 4. Micro-Surge Yield &amp; Urban Shocks
          </button>
        </div>

        {/* ── Main Dual-Screen Layout ── */}
        <div className={styles.arenaLayout}>
          {/* LEFT: CANVAS GRID MAP */}
          <div className={styles.canvasCard}>
            <div className={styles.canvasHeader}>
              <div className={styles.canvasTitle}>
                <FaMapMarkedAlt color="var(--color-blue)" /> NYC Spatial Agent-Based Grid Simulation
              </div>
              <div className={`${styles.canvasStatusBadge} ${!isPlaying ? styles.canvasStatusBadgePaused : ''}`}>
                {isPlaying ? <><FaPlay size={10} /> Live 60 FPS Engine</> : <><FaPause size={10} /> Paused</>} ({liveMetrics.onlineAgents}/{liveMetrics.totalAgents} Online)
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

            {/* Playback Controls */}
            <div className={styles.playbackBar}>
              <div className={styles.playbackControls}>
                <button
                  className={`${styles.controlBtn} ${isPlaying ? styles.controlBtnActive : ''}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <><FaPause /> Pause</> : <><FaPlay /> Resume</>}
                </button>
                <button
                  className={`${styles.controlBtn} ${simSpeed === 1 ? styles.controlBtnActive : ''}`}
                  onClick={() => setSimSpeed(1)}
                >
                  1x
                </button>
                <button
                  className={`${styles.controlBtn} ${simSpeed === 2 ? styles.controlBtnActive : ''}`}
                  onClick={() => setSimSpeed(2)}
                >
                  2x
                </button>
                <button
                  className={`${styles.controlBtn} ${simSpeed === 4 ? styles.controlBtnActive : ''}`}
                  onClick={() => setSimSpeed(4)}
                >
                  4x Speed
                </button>
              </div>

              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                Simulation Tick: <strong>{simTick}</strong> | Avg Fleet Stamina: <strong>{liveMetrics.avgStamina}%</strong>
              </div>
            </div>

            {/* Map Legend */}
            <div className={styles.legendBar}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#10b981' }} />
                <span>In-Trip (Generating Revenue)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#f59e0b' }} />
                <span>Cruising / Seeking (Deadheading)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#ef4444' }} />
                <span>Gridlocked / Flooded (Delayed)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#2563eb' }} />
                <span>Proactive Forward Staged</span>
              </div>
            </div>
          </div>

          {/* RIGHT: CONTROL COCKPIT */}
          <div className={styles.panelCard}>
            {/* ── TAB 1: FLEET OPS COCKPIT ── */}
            {activePersona === 'fleet' && (
              <>
                <div className={styles.panelTitle}>
                  <FaTaxi color="var(--color-blue)" /> Fleet Operations &amp; Forward Staging
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>1. Operational Scenario Preset</label>
                  <select
                    className={styles.select}
                    value={selectedScenario}
                    onChange={e => setSelectedScenario(e.target.value as any)}
                  >
                    <option value="penn_rain">Penn Station Severe Storm Egress (High Transit Spillover)</option>
                    <option value="lic_starvation">Long Island City Boundary Starvation (Bridge Deficit)</option>
                    <option value="yankee_egress">Yankee Stadium Post-Game Surge (Rapid Outflow Egress)</option>
                  </select>
                </div>

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>
                    <span className={styles.toggleTitle}>Proactive Dispatch (-20 min Staging)</span>
                    <span className={styles.toggleSub}>Forward-stage vacant vehicles with $3.50 deadhead subsidy</span>
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

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>
                    <span className={styles.toggleTitle}>Virtual Batching Hubs</span>
                    <span className={styles.toggleSub}>Consolidate rider queues at sheltered hubs &amp; dispatch batches</span>
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

                <div className={styles.formGroup}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Additional Fleet Deployment</label>
                    <span className={styles.rangeValue}>+{additionalFleetCount} drivers</span>
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
                </div>

                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Customer Wait Time (ETA)</div>
                    <div className={styles.kpiValue} style={{ color: proactiveDispatch ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {liveMetrics.avgWaitTimeMin.toFixed(1)}m
                    </div>
                    <div className={styles.kpiSub}>{proactiveDispatch ? '-68% reduction vs baseline' : 'Elevated storm queuing'}</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Fulfillment Rate</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--color-blue)' }}>
                      {liveMetrics.fulfillmentRatePct.toFixed(1)}%
                    </div>
                    <div className={styles.kpiSub}>{formatNumber(liveMetrics.completedTrips)} completed trips</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Deadhead Reduction</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--color-purple)' }}>
                      -{liveMetrics.deadheadReductionPct.toFixed(1)}%
                    </div>
                    <div className={styles.kpiSub}>Optimized return corridors</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Dispatch Subsidy ROI</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--color-green)' }}>
                      {liveMetrics.operationalRoi.toFixed(1)}x
                    </div>
                    <div className={styles.kpiSub}>Spend ${formatNumber(liveMetrics.dispatchSubsidyCost)} get +{formatCurrency(liveMetrics.grossRevenueUplift)}</div>
                  </div>
                </div>

                <div className={styles.recommendationCard}>
                  <div className={styles.recommendationTitle}>
                    <FaCheckCircle /> Operations Recommendation:
                  </div>
                  <p className={styles.recommendationText}>
                    Enabling <strong>Proactive Dispatch</strong> with <strong>Virtual Batching Hubs</strong> clears high-density transit bottlenecks <strong>64% faster</strong>, shortening passenger wait time from 26.5m down to <strong>7.8m</strong> and yielding a <strong>{liveMetrics.operationalRoi.toFixed(1)}x ROI</strong> on deadhead subsidies.
                  </p>
                </div>
              </>
            )}

            {/* ── TAB 2: PRICING STRATEGY COCKPIT ── */}
            {activePersona === 'pricing' && (
              <>
                <div className={styles.panelTitle}>
                  <FaBolt color="var(--color-blue)" /> Dynamic Surge Pricing &amp; Liquidity Arena
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Surge Pricing Multiplier (P_rider)</label>
                    <span className={styles.rangeValue} style={{ fontSize: '1.2rem', color: surgeMultiplier > 2.0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                      {surgeMultiplier.toFixed(1)}x
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
                    <span>1.0x (Base)</span>
                    <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>1.8x GMV Sweet Spot</span>
                    <span style={{ color: 'var(--color-red)' }}>3.0x Liquidity Lockout</span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Applied Weather Condition</label>
                  <select
                    className={styles.select}
                    value={weatherSeverity}
                    onChange={e => setWeatherSeverity(e.target.value as any)}
                  >
                    <option value="clear">Clear Skies (Standard baseline demand)</option>
                    <option value="moderate">Moderate Rain (1.4x demand surge)</option>
                    <option value="heavy_storm">Severe Flood Storm (2.3x demand spike)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Driver Weather Bonus (P_driver Split-Rate)</label>
                    <span className={styles.rangeValue}>+${driverIncentiveBonus.toFixed(2)} / trip</span>
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

                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Projected Gross Merchandise Value</div>
                    <div className={styles.kpiValue} style={{ color: surgeMultiplier <= 1.8 ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {formatCurrency(liveMetrics.totalGmv)}
                    </div>
                    <div className={styles.kpiSub}>Platform take: {formatCurrency(liveMetrics.platformRevenue)}</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Conversion Rate</div>
                    <div className={styles.kpiValue} style={{ color: liveMetrics.conversionRate > 50 ? 'var(--color-blue)' : 'var(--color-red)' }}>
                      {liveMetrics.conversionRate.toFixed(1)}%
                    </div>
                    <div className={styles.kpiSub}>{surgeMultiplier > 2.0 ? 'Elevated price resistance drop-off' : 'High market liquidity'}</div>
                  </div>
                </div>

                {surgeMultiplier > 2.0 ? (
                  <div className={styles.recommendationWarning}>
                    <div className={styles.recommendationTitleWarning}>
                      <FaExclamationTriangle /> Warning: Liquidity Deadlock Threshold Exceeded
                    </div>
                    <p className={styles.recommendationText}>
                      When surge exceeds <strong>2.0x</strong>, customer drop-off rises to <strong>{(100 - liveMetrics.conversionRate).toFixed(0)}%</strong>. Drivers rush into high-priced zones only to sit idle for 35+ minutes. Recommended policy: Enforce a dynamic surge cap at <strong>1.8x</strong> paired with targeted micro-subsidies.
                    </p>
                  </div>
                ) : (
                  <div className={styles.recommendationCard}>
                    <div className={styles.recommendationTitle}>
                      <FaCheckCircle /> GMV Optimization Equilibrium:
                    </div>
                    <p className={styles.recommendationText}>
                      A surge of <strong>{surgeMultiplier.toFixed(1)}x</strong> sustains rider conversion at <strong>{liveMetrics.conversionRate.toFixed(1)}%</strong>, maximizing platform GMV at <strong>{formatCurrency(liveMetrics.totalGmv)}</strong> without triggering customer evaporation.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── TAB 3: DRIVER FATIGUE & CHURN ENGINE ── */}
            {activePersona === 'fatigue' && (
              <>
                <div className={styles.panelTitle}>
                  <FaBatteryHalf color="var(--color-blue)" /> Driver Fatigue &amp; Churn Probability Engine
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Stochastic fatigue model: Prolonged gridlock and deadheading deplete driver stamina. When stamina drops to 0%, drivers <strong>switch offline (churn)</strong>, causing catastrophic network supply failure.
                </p>

                {/* Fleet Health Meter */}
                <div className={styles.staminaWrapper}>
                  <div className={styles.staminaHeader}>
                    <span>Active Online Fleet Share:</span>
                    <strong style={{ color: liveMetrics.fleetOnlinePct > 70 ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {liveMetrics.fleetOnlinePct}% ({liveMetrics.onlineAgents}/{liveMetrics.totalAgents} vehicles active)
                    </strong>
                  </div>
                  <div className={styles.staminaBarBg}>
                    <div
                      className={styles.staminaBarFill}
                      style={{
                        width: `${liveMetrics.fleetOnlinePct}%`,
                        background: liveMetrics.fleetOnlinePct > 70 ? 'var(--color-green)' : (liveMetrics.fleetOnlinePct > 40 ? 'var(--color-amber)' : 'var(--color-red)'),
                      }}
                    />
                  </div>
                </div>

                {/* Traffic Jam Subsidy Slider */}
                <div className={styles.formGroup} style={{ marginTop: 8 }}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Traffic Jam Relief Subsidy</label>
                    <span className={styles.rangeValue}>+${trafficJamSubsidy.toFixed(2)} / 15 min delay</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={trafficJamSubsidy}
                    onChange={e => setTrafficJamSubsidy(Number(e.target.value))}
                    className={styles.range}
                  />
                  <div className={styles.rangeScale}>
                    <span>$0 (No relief)</span>
                    <span>$4.00 (Standard benchmark)</span>
                    <span>$8.00 (Maximum retention)</span>
                  </div>
                </div>

                <div className={styles.recommendationCard}>
                  <div className={styles.recommendationTitle}>
                    <FaLightbulb color="var(--color-amber)" /> Strategic Trade-Off Analysis:
                  </div>
                  <p className={styles.recommendationText}>
                    Offering a <strong>${trafficJamSubsidy.toFixed(2)} / 15 min relief payment</strong> preserves driver stamina, retaining <strong>{liveMetrics.fleetOnlinePct}% of the active fleet</strong> during severe storm events and mitigating up to <strong>{formatCurrency(cumulativeLostRevenue)}</strong> in shadow revenue leakage.
                  </p>
                </div>
              </>
            )}

            {/* ── TAB 4: MICRO-SURGE & URBAN SHOCKS ── */}
            {activePersona === 'micro_surge' && (
              <>
                <div className={styles.panelTitle}>
                  <FaTrafficLight color="var(--color-blue)" /> Micro-Surge Yield &amp; Urban Shock Center
                </div>

                {/* Urban Shock Center */}
                <div className={styles.shockSection}>
                  <div className={styles.shockHeader}>
                    <FaExclamationTriangle color="var(--color-amber)" /> Urban Shock Triggers:
                  </div>
                  <div className={styles.shockGrid}>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'msg_concert' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'msg_concert' ? 'none' : 'msg_concert')}
                    >
                      <FaMusic color="var(--color-red)" /> MSG Concert Egress (+300% Demand)
                    </button>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'lincoln_accident' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'lincoln_accident' ? 'none' : 'lincoln_accident')}
                    >
                      <FaTrafficLight color="var(--color-amber)" /> Lincoln Tunnel Incident (-65% Speed)
                    </button>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'gas_price_spike' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'gas_price_spike' ? 'none' : 'gas_price_spike')}
                    >
                      <FaGasPump color="var(--color-blue)" /> Fuel Price Spike (+25% Cost)
                    </button>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'flash_flood' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'flash_flood' ? 'none' : 'flash_flood')}
                    >
                      <FaWater color="var(--color-purple)" /> Bridge Flood Lockout
                    </button>
                  </div>
                </div>

                {/* Micro-surge Route Selector */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>1. Select Target Corridor for Yield Pricing</label>
                  <select
                    className={styles.select}
                    value={selectedRouteKey}
                    onChange={e => setSelectedRouteKey(e.target.value)}
                  >
                    <option value="midtown_lic">Midtown &rarr; Long Island City (Flood Hazard Route)</option>
                    <option value="fidi_jfk">FiDi Downtown &rarr; JFK Airport (Deadhead Risk Corridor)</option>
                    <option value="upper_lic">Upper Manhattan &rarr; Queens LIC (Triborough Bypass)</option>
                  </select>
                </div>

                {/* Hazard Surcharge Slider */}
                <div className={styles.formGroup}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Hazard Road Surcharge</label>
                    <span className={styles.rangeValue}>+${hazardSurcharge.toFixed(2)} / trip</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={hazardSurcharge}
                    onChange={e => setHazardSurcharge(Number(e.target.value))}
                    className={styles.range}
                  />
                </div>

                {/* Route Yield & Acceptance Output */}
                <div className={styles.routeYieldCard}>
                  <div className={styles.yieldMetric}>
                    <span className={styles.yieldLabel}>Expected Yield Per Minute:</span>
                    <span className={styles.yieldValue} style={{ color: 'var(--color-blue)' }}>
                      ${liveMetrics.expectedYieldPerMin.toFixed(2)} / min
                    </span>
                  </div>
                  <div className={styles.yieldMetric}>
                    <span className={styles.yieldLabel}>Driver Acceptance Probability:</span>
                    <span className={styles.yieldValue} style={{ color: liveMetrics.routeAcceptanceRate > 70 ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {liveMetrics.routeAcceptanceRate}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




