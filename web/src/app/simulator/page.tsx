'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { getData, formatCurrency, formatNumber } from '@/lib/data';
import type { SimulatorBase, ZoneRevenue, SurgeElasticityPoint } from '@/types';
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
  FaSearchLocation,
  FaArrowLeft,
  FaCity,
  FaSlidersH,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
} from 'react-icons/fa';
import styles from './simulator.module.css';

// ── 1. Comprehensive NYC 24+ TLC Spatial Topology ────────────────────────────
export interface ZoneDef {
  id: string;
  name: string;
  shortName: string;
  nx: number; // normalized x (0 to 1)
  ny: number; // normalized y (0 to 1)
  borough: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island';
  baseLambda: number; // baseline Poisson request arrivals per min
  avgFare: number;
}

export const NYC_24_ZONES: Record<string, ZoneDef> = {
  // Manhattan
  riverdale: { id: 'riverdale', name: 'Riverdale / Spuyten Duyvil', shortName: 'Riverdale', nx: 0.41, ny: 0.06, borough: 'Bronx', baseLambda: 28, avgFare: 24.5 },
  yankee: { id: 'yankee', name: 'Yankee Stadium / Concourse', shortName: 'Yankee Hub', nx: 0.47, ny: 0.11, borough: 'Bronx', baseLambda: 65, avgFare: 21.0 },
  south_bronx: { id: 'south_bronx', name: 'South Bronx / Mott Haven', shortName: 'S. Bronx', nx: 0.54, ny: 0.15, borough: 'Bronx', baseLambda: 42, avgFare: 19.5 },
  inwood: { id: 'inwood', name: 'Inwood / Washington Heights', shortName: 'Inwood / Wash Hts', nx: 0.39, ny: 0.13, borough: 'Manhattan', baseLambda: 55, avgFare: 22.0 },
  harlem: { id: 'harlem', name: 'Harlem / Morningside Heights', shortName: 'Harlem Hub', nx: 0.40, ny: 0.22, borough: 'Manhattan', baseLambda: 110, avgFare: 18.5 },
  uws: { id: 'uws', name: 'Upper West Side (Lincoln Center)', shortName: 'Upper West', nx: 0.35, ny: 0.32, borough: 'Manhattan', baseLambda: 145, avgFare: 17.2 },
  ues: { id: 'ues', name: 'Upper East Side (Museum Mile)', shortName: 'Upper East', nx: 0.46, ny: 0.30, borough: 'Manhattan', baseLambda: 170, avgFare: 16.8 },
  midtown: { id: 'midtown', name: 'Midtown Hub (Penn & Times Sq & Grand Central)', shortName: 'Midtown Core', nx: 0.40, ny: 0.44, borough: 'Manhattan', baseLambda: 420, avgFare: 23.5 },
  chelsea_village: { id: 'chelsea_village', name: 'Chelsea / Greenwich Village / SoHo', shortName: 'Village / SoHo', nx: 0.36, ny: 0.57, borough: 'Manhattan', baseLambda: 260, avgFare: 21.2 },
  fidi: { id: 'fidi', name: 'Financial District / Wall St', shortName: 'FiDi / Downtown', nx: 0.33, ny: 0.70, borough: 'Manhattan', baseLambda: 240, avgFare: 25.0 },

  // Brooklyn
  dumbo: { id: 'dumbo', name: 'DUMBO / Brooklyn Heights', shortName: 'DUMBO / Heights', nx: 0.43, ny: 0.71, borough: 'Brooklyn', baseLambda: 115, avgFare: 22.8 },
  williamsburg: { id: 'williamsburg', name: 'Williamsburg / Greenpoint', shortName: 'Williamsburg', nx: 0.52, ny: 0.56, borough: 'Brooklyn', baseLambda: 180, avgFare: 20.5 },
  bushwick: { id: 'bushwick', name: 'Bushwick / East New York', shortName: 'Bushwick', nx: 0.64, ny: 0.62, borough: 'Brooklyn', baseLambda: 95, avgFare: 19.8 },
  atlantic_downtown: { id: 'atlantic_downtown', name: 'Atlantic Terminal / Downtown Brooklyn', shortName: 'Atlantic Hub', nx: 0.48, ny: 0.80, borough: 'Brooklyn', baseLambda: 210, avgFare: 22.0 },
  crown_heights: { id: 'crown_heights', name: 'Bed-Stuy / Crown Heights', shortName: 'Bed-Stuy / Crown', nx: 0.58, ny: 0.81, borough: 'Brooklyn', baseLambda: 125, avgFare: 19.2 },
  coney_island: { id: 'coney_island', name: 'Bay Ridge / Coney Island', shortName: 'Coney / S. BK', nx: 0.43, ny: 0.94, borough: 'Brooklyn', baseLambda: 60, avgFare: 31.0 },

  // Queens
  astoria: { id: 'astoria', name: 'Astoria / Ditmars', shortName: 'Astoria Hub', nx: 0.56, ny: 0.30, borough: 'Queens', baseLambda: 130, avgFare: 21.5 },
  lic: { id: 'lic', name: 'Long Island City (Hunters Point)', shortName: 'Queens LIC', nx: 0.53, ny: 0.43, borough: 'Queens', baseLambda: 175, avgFare: 22.4 },
  lga: { id: 'lga', name: 'LaGuardia Airport (LGA)', shortName: 'LGA Airport', nx: 0.72, ny: 0.22, borough: 'Queens', baseLambda: 240, avgFare: 42.0 },
  flushing: { id: 'flushing', name: 'Flushing / Citi Field Main St', shortName: 'Flushing Hub', nx: 0.82, ny: 0.32, borough: 'Queens', baseLambda: 140, avgFare: 26.5 },
  forest_hills: { id: 'forest_hills', name: 'Forest Hills / Kew Gardens', shortName: 'Forest Hills', nx: 0.72, ny: 0.51, borough: 'Queens', baseLambda: 105, avgFare: 23.0 },
  jamaica: { id: 'jamaica', name: 'Jamaica AirTrain / LIRR Hub', shortName: 'Jamaica Hub', nx: 0.83, ny: 0.63, borough: 'Queens', baseLambda: 160, avgFare: 28.5 },
  jfk: { id: 'jfk', name: 'JFK International Airport', shortName: 'JFK Airport', nx: 0.88, ny: 0.85, borough: 'Queens', baseLambda: 340, avgFare: 72.0 },

  // Staten Island & Gateway
  st_george: { id: 'st_george', name: 'St. George Ferry (Staten Island)', shortName: 'St. George (SI)', nx: 0.22, ny: 0.89, borough: 'Staten Island', baseLambda: 45, avgFare: 36.0 },
  ewr_gateway: { id: 'ewr_gateway', name: 'Newark Airport / NJ Gateway', shortName: 'NJ / EWR Gateway', nx: 0.20, ny: 0.56, borough: 'Manhattan', baseLambda: 75, avgFare: 58.0 },
};

// ── 2. Real Arterial & River-Crossing Edge Network ────────────────────────────
export interface EdgeGraphDef {
  id: string;
  from: string;
  to: string;
  name: string;
  isCrossing: boolean;
  distanceMiles: number;
  baseSpeedMph: number;
}

export const NYC_36_EDGES: EdgeGraphDef[] = [
  // Bronx <-> Manhattan
  { id: 'broadway_spine_0', from: 'riverdale', to: 'yankee', name: 'Major Deegan North', isCrossing: false, distanceMiles: 2.5, baseSpeedMph: 28 },
  { id: 'broadway_spine_1', from: 'yankee', to: 'inwood', name: 'Macombs Dam Bridge', isCrossing: true, distanceMiles: 1.2, baseSpeedMph: 16 },
  { id: 'cross_bronx', from: 'riverdale', to: 'south_bronx', name: 'Cross Bronx Expressway', isCrossing: false, distanceMiles: 3.8, baseSpeedMph: 22 },
  { id: 'triborough_manh_bx', from: 'harlem', to: 'south_bronx', name: '3rd Ave / Willis Ave Bridge', isCrossing: true, distanceMiles: 1.1, baseSpeedMph: 15 },
  { id: 'triborough_bx_qns', from: 'south_bronx', to: 'astoria', name: 'RFK Triborough (Bronx-Queens)', isCrossing: true, distanceMiles: 2.4, baseSpeedMph: 32 },

  // Manhattan Internal Spine
  { id: 'broadway_spine_2', from: 'inwood', to: 'harlem', name: 'Broadway Upper Spine', isCrossing: false, distanceMiles: 2.1, baseSpeedMph: 14 },
  { id: 'cpw_spine', from: 'harlem', to: 'uws', name: 'Central Park West', isCrossing: false, distanceMiles: 1.9, baseSpeedMph: 12 },
  { id: '5th_ave_spine', from: 'harlem', to: 'ues', name: '5th Ave / Madison Corridor', isCrossing: false, distanceMiles: 1.8, baseSpeedMph: 11 },
  { id: 'broadway_midtown', from: 'uws', to: 'midtown', name: 'Broadway / 8th Ave Midtown', isCrossing: false, distanceMiles: 1.6, baseSpeedMph: 9 },
  { id: 'park_ave_midtown', from: 'ues', to: 'midtown', name: 'Park Ave / Lexington Ave', isCrossing: false, distanceMiles: 1.7, baseSpeedMph: 9 },
  { id: 'fdr_mid_chelsea', from: 'midtown', to: 'chelsea_village', name: '7th Ave / 5th Ave Village Spine', isCrossing: false, distanceMiles: 1.5, baseSpeedMph: 8 },
  { id: 'westside_fidi', from: 'chelsea_village', to: 'fidi', name: 'West Side Hwy / West St', isCrossing: false, distanceMiles: 1.8, baseSpeedMph: 15 },

  // Manhattan <-> New Jersey Gateway
  { id: 'holland_tunnel', from: 'chelsea_village', to: 'ewr_gateway', name: 'Holland Tunnel / I-78 Corridor', isCrossing: true, distanceMiles: 4.2, baseSpeedMph: 24 },
  { id: 'lincoln_tunnel', from: 'midtown', to: 'ewr_gateway', name: 'Lincoln Tunnel Express', isCrossing: true, distanceMiles: 3.9, baseSpeedMph: 22 },

  // Manhattan <-> Queens Crossings
  { id: 'triborough_manh_qns', from: 'harlem', to: 'astoria', name: 'RFK Triborough (Manhattan-Queens)', isCrossing: true, distanceMiles: 2.2, baseSpeedMph: 30 },
  { id: 'queensboro_bridge', from: 'midtown', to: 'lic', name: 'Queensboro Bridge (59th St)', isCrossing: true, distanceMiles: 1.4, baseSpeedMph: 16 },
  { id: 'midtown_tunnel', from: 'midtown', to: 'lic', name: 'Queens-Midtown Tunnel (I-495)', isCrossing: true, distanceMiles: 1.6, baseSpeedMph: 18 },

  // Manhattan <-> Brooklyn Crossings
  { id: 'williamsburg_bridge', from: 'chelsea_village', to: 'williamsburg', name: 'Williamsburg Bridge (Delancey)', isCrossing: true, distanceMiles: 1.7, baseSpeedMph: 16 },
  { id: 'manhattan_bridge', from: 'fidi', to: 'dumbo', name: 'Manhattan Bridge (Canal St)', isCrossing: true, distanceMiles: 1.5, baseSpeedMph: 16 },
  { id: 'brooklyn_bridge', from: 'fidi', to: 'dumbo', name: 'Brooklyn Bridge (Park Row)', isCrossing: true, distanceMiles: 1.3, baseSpeedMph: 14 },
  { id: 'si_ferry_water', from: 'fidi', to: 'st_george', name: 'Staten Island Ferry Maritime Channel', isCrossing: true, distanceMiles: 5.2, baseSpeedMph: 18 },

  // Queens Internal Arteries
  { id: 'astoria_lic', from: 'astoria', to: 'lic', name: '21st St / Vernon Blvd', isCrossing: false, distanceMiles: 2.0, baseSpeedMph: 18 },
  { id: 'gcp_lga', from: 'astoria', to: 'lga', name: 'Grand Central Parkway LGA', isCrossing: false, distanceMiles: 3.1, baseSpeedMph: 26 },
  { id: 'flushing_lga', from: 'lga', to: 'flushing', name: 'Northern Blvd / Whitestone', isCrossing: false, distanceMiles: 2.8, baseSpeedMph: 22 },
  { id: 'lie_lic_forest', from: 'lic', to: 'forest_hills', name: 'Long Island Expressway (LIE / I-495)', isCrossing: false, distanceMiles: 4.6, baseSpeedMph: 24 },
  { id: 'van_wyck_flushing_fh', from: 'flushing', to: 'forest_hills', name: 'Grand Central Pkwy Central', isCrossing: false, distanceMiles: 3.2, baseSpeedMph: 25 },
  { id: 'van_wyck_fh_jam', from: 'forest_hills', to: 'jamaica', name: 'Queens Blvd / Van Wyck Expwy', isCrossing: false, distanceMiles: 2.9, baseSpeedMph: 24 },
  { id: 'van_wyck_jam_jfk', from: 'jamaica', to: 'jfk', name: 'Van Wyck Expressway JFK Spine (I-678)', isCrossing: false, distanceMiles: 3.8, baseSpeedMph: 32 },

  // Brooklyn Internal Arteries
  { id: 'pulaski_lic_wburg', from: 'lic', to: 'williamsburg', name: 'Pulaski Bridge / McGuinness Blvd', isCrossing: true, distanceMiles: 1.8, baseSpeedMph: 18 },
  { id: 'bqe_wburg_dumbo', from: 'williamsburg', to: 'dumbo', name: 'Brooklyn-Queens Expressway (BQE / I-278)', isCrossing: false, distanceMiles: 2.2, baseSpeedMph: 20 },
  { id: 'bqe_dumbo_atlantic', from: 'dumbo', to: 'atlantic_downtown', name: 'Flatbush Ave / Fulton St', isCrossing: false, distanceMiles: 1.4, baseSpeedMph: 12 },
  { id: 'bushwick_wburg', from: 'williamsburg', to: 'bushwick', name: 'Flushing Ave / Bushwick Corridor', isCrossing: false, distanceMiles: 2.6, baseSpeedMph: 16 },
  { id: 'atlantic_bedstuy', from: 'atlantic_downtown', to: 'crown_heights', name: 'Atlantic Ave / Eastern Pkwy Spine', isCrossing: false, distanceMiles: 2.5, baseSpeedMph: 16 },
  { id: 'crown_bushwick', from: 'crown_heights', to: 'bushwick', name: 'Broadway / Utica Ave', isCrossing: false, distanceMiles: 2.3, baseSpeedMph: 15 },
  { id: 'bqe_atlantic_coney', from: 'atlantic_downtown', to: 'coney_island', name: 'Gowanus / Belt Parkway South', isCrossing: false, distanceMiles: 5.4, baseSpeedMph: 28 },
  { id: 'verrazzano_coney_si', from: 'coney_island', to: 'st_george', name: 'Verrazzano-Narrows Bridge (I-278)', isCrossing: true, distanceMiles: 4.8, baseSpeedMph: 35 },
  { id: 'belt_crown_jfk', from: 'crown_heights', to: 'jfk', name: 'Conduit Ave / Belt Parkway East', isCrossing: false, distanceMiles: 6.2, baseSpeedMph: 30 },
];

// ── 3. Dijkstra Shortest Path Router Engine ──────────────────────────────────
function buildAdjacencyList(closedCrossings: Record<string, boolean>, weatherFactor: number) {
  const adj: Record<string, Array<{ to: string; edgeId: string; weight: number }>> = {};

  Object.keys(NYC_24_ZONES).forEach(nodeId => {
    adj[nodeId] = [];
  });

  NYC_36_EDGES.forEach(edge => {
    const isClosed = closedCrossings[edge.id];
    let effectiveSpeed = edge.baseSpeedMph;
    if (edge.isCrossing) effectiveSpeed *= 0.9;
    effectiveSpeed /= weatherFactor;

    const baseDurationMin = (edge.distanceMiles / effectiveSpeed) * 60;
    const weight = isClosed ? 999999 : baseDurationMin;

    if (adj[edge.from]) {
      adj[edge.from].push({ to: edge.to, edgeId: edge.id, weight });
    }
    if (adj[edge.to]) {
      adj[edge.to].push({ to: edge.from, edgeId: edge.id, weight });
    }
  });

  return adj;
}

function dijkstraShortestPath(
  startNode: string,
  endNode: string,
  adj: Record<string, Array<{ to: string; edgeId: string; weight: number }>>
): string[] {
  if (startNode === endNode) return [startNode];

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  Object.keys(NYC_24_ZONES).forEach(nodeId => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  });

  distances[startNode] = 0;

  while (unvisited.size > 0) {
    let closestNode: string | null = null;
    let shortestDist = Infinity;

    unvisited.forEach(nodeId => {
      if (distances[nodeId] < shortestDist) {
        shortestDist = distances[nodeId];
        closestNode = nodeId;
      }
    });

    if (!closestNode || shortestDist === Infinity) break;
    if (closestNode === endNode) break;

    unvisited.delete(closestNode);

    const neighbors = adj[closestNode] || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;
      const alt = distances[closestNode] + neighbor.weight;
      if (alt < distances[neighbor.to]) {
        distances[neighbor.to] = alt;
        previous[neighbor.to] = closestNode;
      }
    }
  }

  const path: string[] = [];
  let curr: string | null = endNode;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return path.length > 0 && path[0] === startNode ? path : [startNode, endNode];
}

// ── 4. Autonomous Agent Model with Multi-Hop Route Stack ──────────────────────
interface MultiHopAgent {
  id: number;
  currentFrom: string;
  currentTo: string;
  pathWaypoints: string[];
  waypointIndex: number;
  progress: number;
  speed: number;
  status: 'in_trip' | 'cruising' | 'stuck' | 'dispatched' | 'offline';
  stamina: number;
  profile: 'risk_seeking' | 'risk_averse' | 'local';
  fare: number;
}

export default function SimulatorPage() {
  const [baseData, setBaseData] = useState<SimulatorBase[]>([]);
  const [zonesData, setZonesData] = useState<ZoneRevenue[]>([]);
  const [surgeCurve, setSurgeCurve] = useState<SurgeElasticityPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Simulator Persona Navigation ────────────────────────────────────────────
  const [activePersona, setActivePersona] = useState<'fleet' | 'pricing' | 'fatigue' | 'micro_surge'>('fleet');
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState<boolean>(false);

  // ── Animation Playback State ────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTick, setSimTick] = useState<number>(0);

  // ── Urban Shock State ───────────────────────────────────────────────────────
  const [activeShock, setActiveShock] = useState<'none' | 'msg_concert' | 'lincoln_accident' | 'gas_price_spike' | 'flash_flood'>('none');

  // ── Cumulative Shadow Lost Revenue Ticker ───────────────────────────────────
  const [cumulativeLostRevenue, setCumulativeLostRevenue] = useState<number>(3120.0);

  // ── Selected Borough Filter & Inspected Zone ────────────────────────────────
  const [selectedBoroughFilter, setSelectedBoroughFilter] = useState<'ALL' | 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island'>('ALL');
  const [inspectedZoneId, setInspectedZoneId] = useState<string | null>('midtown');

  // ── Fleet Ops Controls ──────────────────────────────────────────────────────
  const [selectedScenario, setSelectedScenario] = useState<'penn_rain' | 'yankee_egress' | 'lic_starvation' | 'jfk_surge'>('penn_rain');
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
    holland_tunnel: false,
    verrazzano_coney_si: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const agentsRef = useRef<MultiHopAgent[]>([]);

  // Load backend baseline datasets
  useEffect(() => {
    Promise.all([
      getData.simulatorBase().catch(() => []),
      getData.zoneRevenue().catch(() => []),
      getData.surgeElasticityCurve().catch(() => []),
    ]).then(([b, z, s]) => {
      setBaseData(b);
      setZonesData(z);
      setSurgeCurve(s);
      setLoading(false);
    });
  }, []);

  // Weather Speed Degradation Multiplier
  const weatherSpeedFactor = useMemo(() => {
    if (weatherSeverity === 'heavy_storm') return 1.55;
    if (weatherSeverity === 'moderate') return 1.25;
    return 1.0;
  }, [weatherSeverity]);

  // Precompute Adjacency List for Dijkstra Routing
  const graphAdjacency = useMemo(() => {
    return buildAdjacencyList(closedCrossings, weatherSpeedFactor);
  }, [closedCrossings, weatherSpeedFactor]);

  // Initialize 200 Multi-Hop Agents across 24 TLC Zones
  useEffect(() => {
    const totalAgents = 200;
    const nodeKeys = Object.keys(NYC_24_ZONES);
    const initialAgents: MultiHopAgent[] = [];

    for (let i = 0; i < totalAgents; i++) {
      const from = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      let to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      while (to === from) {
        to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      }

      const initialPath = dijkstraShortestPath(from, to, graphAdjacency);
      const isTrip = Math.random() > 0.35;
      const profileRand = Math.random();
      const profile: MultiHopAgent['profile'] = profileRand < 0.35 ? 'risk_seeking' : (profileRand < 0.80 ? 'risk_averse' : 'local');

      initialAgents.push({
        id: i,
        currentFrom: initialPath[0] || from,
        currentTo: initialPath[1] || to,
        pathWaypoints: initialPath,
        waypointIndex: 0,
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.004,
        status: isTrip ? 'in_trip' : 'cruising',
        stamina: 75 + Math.random() * 25,
        profile,
        fare: 18 + Math.random() * 32,
      });
    }
    agentsRef.current = initialAgents;
  }, [graphAdjacency]);

  // Handle Fullscreen Dynamic Resizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // ── Helper to convert Normalized Coords (nx, ny) to Canvas Pixels ──────────
  const getCanvasCoords = (nx: number, ny: number, width: number, height: number) => {
    const padX = width * 0.08;
    const padY = height * 0.10;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    return {
      x: padX + nx * innerW,
      y: padY + ny * innerH,
    };
  };

  // ── Fullscreen Live Animation Loop ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Light background fill
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Subtle Water Arteries Background (East River & Hudson River visual shapes)
      const hudsonCenter = getCanvasCoords(0.28, 0.48, w, h);
      const eastRiverCenter = getCanvasCoords(0.48, 0.52, w, h);

      ctx.fillStyle = 'rgba(219, 234, 254, 0.45)';
      ctx.beginPath();
      ctx.ellipse(hudsonCenter.x, hudsonCenter.y, w * 0.07, h * 0.45, -0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eastRiverCenter.x, eastRiverCenter.y, w * 0.05, h * 0.42, -0.28, 0, Math.PI * 2);
      ctx.fill();

      // Background blueprint grid
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1 * dpr;
      const gridStep = 40 * dpr;
      for (let x = 0; x < w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 1. Draw 36 Arterial Edges
      NYC_36_EDGES.forEach(edge => {
        const fromNode = NYC_24_ZONES[edge.from];
        const toNode = NYC_24_ZONES[edge.to];
        if (!fromNode || !toNode) return;

        const fromPos = getCanvasCoords(fromNode.nx, fromNode.ny, w, h);
        const toPos = getCanvasCoords(toNode.nx, toNode.ny, w, h);

        const isClosed = closedCrossings[edge.id];
        const isShocked = (activeShock === 'lincoln_accident' && edge.id === 'lincoln_tunnel') ||
                          (activeShock === 'flash_flood' && edge.isCrossing);

        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);

        if (isClosed || isShocked) {
          ctx.strokeStyle = isClosed ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 3.5 * dpr;
          ctx.setLineDash([6 * dpr, 6 * dpr]);
        } else if (edge.isCrossing) {
          ctx.strokeStyle = '#60a5fa'; // River bridge crossings
          ctx.lineWidth = 2.8 * dpr;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#cbd5e1'; // Clean slate arterial roads
          ctx.lineWidth = 2.0 * dpr;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (isClosed || isShocked) {
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;
          ctx.fillStyle = isClosed ? '#ef4444' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(midX, midY, 6.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${8 * dpr}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isClosed ? '✕' : '!', midX, midY);
        }
      });

      // 2. Pulse Rings on High-Demand Hubs / Virtual Hubs / Shocks
      const pulseTime = Date.now() / 400;
      const pulseRadius = (16 + Math.sin(pulseTime) * 6) * dpr;

      if (proactiveDispatch) {
        const midtownPos = getCanvasCoords(NYC_24_ZONES.midtown.nx, NYC_24_ZONES.midtown.ny, w, h);
        ctx.beginPath();
        ctx.arc(midtownPos.x, midtownPos.y, pulseRadius + 8 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();
      }

      if (activeShock === 'msg_concert') {
        const midtownPos = getCanvasCoords(NYC_24_ZONES.midtown.nx, NYC_24_ZONES.midtown.ny, w, h);
        ctx.beginPath();
        ctx.arc(midtownPos.x, midtownPos.y, pulseRadius + 18 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
      }

      if (virtualBatchingHubs) {
        [NYC_24_ZONES.lic, NYC_24_ZONES.atlantic_downtown, NYC_24_ZONES.jfk].forEach(hub => {
          const hubPos = getCanvasCoords(hub.nx, hub.ny, w, h);
          ctx.beginPath();
          ctx.arc(hubPos.x, hubPos.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        });
      }

      // 3. Draw 24+ Zone Nodes
      Object.values(NYC_24_ZONES).forEach(node => {
        const pos = getCanvasCoords(node.nx, node.ny, w, h);
        const isInspected = node.id === inspectedZoneId;
        const isFiltered = selectedBoroughFilter === 'ALL' || node.borough === selectedBoroughFilter;

        ctx.globalAlpha = isFiltered ? 1.0 : 0.25;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (isInspected ? 13 : 9) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.strokeStyle = isInspected
          ? '#2563eb'
          : (node.borough === 'Manhattan' ? '#3b82f6' : (node.borough === 'Brooklyn' ? '#10b981' : (node.borough === 'Queens' ? '#f59e0b' : '#8b5cf6')));
        ctx.lineWidth = (isInspected ? 3.0 : 2.0) * dpr;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (isInspected ? 4 : 3) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = isInspected ? '#2563eb' : '#64748b';
        ctx.fill();

        // Node Label with subtle halo
        ctx.font = isInspected ? `bold ${11 * dpr}px Inter, sans-serif` : `600 ${9.5 * dpr}px Inter, sans-serif`;
        ctx.fillStyle = isInspected ? '#1d4ed8' : '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText(node.shortName, pos.x, pos.y - (isInspected ? 18 : 14) * dpr);

        ctx.globalAlpha = 1.0;
      });

      // 4. Update and Draw Moving Multi-Hop Agents
      const agents = agentsRef.current;
      const nodeKeys = Object.keys(NYC_24_ZONES);

      agents.forEach(agent => {
        if (agent.status === 'offline') return;

        if (isPlaying) {
          let currentSpeed = agent.speed * simSpeed;
          if (weatherSeverity === 'heavy_storm') currentSpeed *= 0.65;
          if (activeShock === 'gas_price_spike') currentSpeed *= 0.85;

          const edge = NYC_36_EDGES.find(
            e => (e.from === agent.currentFrom && e.to === agent.currentTo) || (e.from === agent.currentTo && e.to === agent.currentFrom)
          );

          if (edge && (closedCrossings[edge.id] || (activeShock === 'flash_flood' && edge.isCrossing))) {
            agent.status = 'stuck';
            currentSpeed *= 0.12;
            const staminaDrain = Math.max(0.02, 0.08 - trafficJamSubsidy * 0.012);
            agent.stamina = Math.max(0, agent.stamina - staminaDrain * simSpeed);
          } else if (proactiveDispatch && agent.currentTo === 'midtown') {
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
            agent.waypointIndex += 1;

            if (agent.waypointIndex < agent.pathWaypoints.length - 1) {
              agent.currentFrom = agent.pathWaypoints[agent.waypointIndex];
              agent.currentTo = agent.pathWaypoints[agent.waypointIndex + 1];
            } else {
              const startFrom = agent.pathWaypoints[agent.pathWaypoints.length - 1] || agent.currentTo;
              let nextTarget = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];

              if ((selectedScenario === 'penn_rain' || activeShock === 'msg_concert') && Math.random() < 0.45) {
                nextTarget = 'midtown';
              } else if (selectedScenario === 'lic_starvation' && Math.random() < 0.40) {
                nextTarget = 'lic';
              } else if (selectedScenario === 'jfk_surge' && Math.random() < 0.50) {
                nextTarget = 'jfk';
              } else if (selectedScenario === 'yankee_egress' && Math.random() < 0.45) {
                nextTarget = 'yankee';
              }

              while (nextTarget === startFrom) {
                nextTarget = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
              }

              const newPath = dijkstraShortestPath(startFrom, nextTarget, graphAdjacency);
              agent.pathWaypoints = newPath;
              agent.waypointIndex = 0;
              agent.currentFrom = newPath[0] || startFrom;
              agent.currentTo = newPath[1] || nextTarget;

              const pickupProb = surgeMultiplier > 2.2 ? 0.32 : (surgeMultiplier >= 1.6 ? 0.84 : 0.72);
              agent.status = Math.random() < pickupProb ? 'in_trip' : 'cruising';
              if (agent.status === 'in_trip') {
                agent.stamina = Math.min(100, agent.stamina + 3.0);
              }
            }
          }
        }

        const fromNode = NYC_24_ZONES[agent.currentFrom];
        const toNode = NYC_24_ZONES[agent.currentTo];
        if (!fromNode || !toNode) return;

        const fromPos = getCanvasCoords(fromNode.nx, fromNode.ny, w, h);
        const toPos = getCanvasCoords(toNode.nx, toNode.ny, w, h);

        const curX = fromPos.x + (toPos.x - fromPos.x) * agent.progress;
        const curY = fromPos.y + (toPos.y - fromPos.y) * agent.progress;

        let dotColor = '#f59e0b'; // cruising amber
        if (agent.status === 'in_trip') dotColor = '#10b981'; // in-trip green
        if (agent.status === 'stuck') dotColor = '#ef4444'; // stuck red
        if (agent.status === 'dispatched') dotColor = '#2563eb'; // proactive blue

        ctx.beginPath();
        ctx.arc(curX, curY, (agent.status === 'in_trip' ? 4.0 : 3.0) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0 * dpr;
        ctx.stroke();

        if (agent.stamina < 30) {
          ctx.beginPath();
          ctx.arc(curX, curY, 6.0 * dpr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = 1.2 * dpr;
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
  }, [isPlaying, simSpeed, selectedScenario, activeShock, proactiveDispatch, virtualBatchingHubs, surgeMultiplier, weatherSeverity, trafficJamSubsidy, closedCrossings, graphAdjacency, inspectedZoneId, selectedBoroughFilter]);

  // Click on Fullscreen Canvas to inspect Zone
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    let closestId: string | null = null;
    let minDist = 35 * dpr;

    Object.values(NYC_24_ZONES).forEach(node => {
      const pos = getCanvasCoords(node.nx, node.ny, canvas.width, canvas.height);
      const dist = Math.hypot(pos.x - clickX, pos.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestId = node.id;
      }
    });

    if (closestId) {
      setInspectedZoneId(closestId);
    }
  };

  // ── Calculated Real-Time Metrics ──────────────────────────────────────────
  const liveMetrics = useMemo(() => {
    const baselineTrips = 18500;
    const baseFare = 24.80;

    const surgeFactor = surgeMultiplier;
    let conversionRate = Math.max(12, Math.min(95, 95 - Math.pow(surgeFactor - 1.0, 1.8) * 35));
    if (weatherSeverity === 'heavy_storm') conversionRate += 8;
    if (activeShock === 'msg_concert') conversionRate -= 6;

    const completedTrips = Math.round(baselineTrips * (conversionRate / 100) * (proactiveDispatch ? 1.25 : 1.0));
    const effectiveAvgFare = baseFare * surgeFactor;
    const totalGmv = completedTrips * effectiveAvgFare;
    const platformTakeRate = 0.20;
    const platformRevenue = totalGmv * platformTakeRate;

    const dispatchSubsidyCost = proactiveDispatch ? additionalFleetCount * 3.50 : 0;
    const grossRevenueUplift = proactiveDispatch ? (completedTrips - baselineTrips * 0.75) * effectiveAvgFare : 0;
    const operationalRoi = dispatchSubsidyCost > 0 ? (grossRevenueUplift / dispatchSubsidyCost) : 0;

    let avgWaitTimeMin = proactiveDispatch ? 6.8 : 24.5;
    if (closedCrossings.queensboro_bridge || closedCrossings.midtown_tunnel || activeShock === 'lincoln_accident') {
      avgWaitTimeMin += 7.8;
    }
    if (virtualBatchingHubs) {
      avgWaitTimeMin = Math.max(4.8, avgWaitTimeMin * 0.55);
    }

    const totalAgents = agentsRef.current.length || 200;
    const onlineAgents = agentsRef.current.filter(a => a.status !== 'offline').length || 185;
    const fleetOnlinePct = Math.round((onlineAgents / totalAgents) * 100);
    const avgStamina = Math.round(agentsRef.current.reduce((s, a) => s + a.stamina, 0) / totalAgents) || 74;

    const routeBaselineDuration = selectedRouteKey === 'midtown_lic' ? 32 : (selectedRouteKey === 'fidi_jfk' ? 48 : 24);
    const routeBaselineFare = selectedRouteKey === 'midtown_lic' ? 28.5 : (selectedRouteKey === 'fidi_jfk' ? 62.0 : 21.0);
    const expectedYieldPerMin = (routeBaselineFare + hazardSurcharge) / (routeBaselineDuration + (weatherSeverity === 'heavy_storm' ? 12 : 4));
    const routeAcceptanceRate = Math.min(95, Math.max(25, Math.round((1 / (1 + Math.exp(-6 * (expectedYieldPerMin - 0.55)))) * 100)));

    const deadheadReductionPct = proactiveDispatch ? 36.5 : 0;
    const fulfillmentRatePct = Math.min(97.2, (completedTrips / baselineTrips) * 100);

    // Inspected zone specific metrics
    const activeZone = inspectedZoneId ? NYC_24_ZONES[inspectedZoneId] : null;
    const zonePoissonDemand = activeZone ? Math.round(activeZone.baseLambda * (weatherSeverity === 'heavy_storm' ? 2.1 : (weatherSeverity === 'moderate' ? 1.4 : 1.0)) * (activeShock === 'msg_concert' && inspectedZoneId === 'midtown' ? 3.0 : 1.0)) : 0;
    const zoneActiveVehicles = activeZone ? (agentsRef.current.filter(a => a.currentTo === activeZone.id && a.status !== 'offline').length || 8) : 0;
    const zoneDeficit = Math.max(0, zonePoissonDemand - zoneActiveVehicles * 12);
    const zoneLostRevenueRate = activeZone ? Math.round(zoneDeficit * activeZone.avgFare * 0.65) : 0;

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
      activeZone,
      zonePoissonDemand,
      zoneActiveVehicles,
      zoneDeficit,
      zoneLostRevenueRate,
    };
  }, [surgeMultiplier, weatherSeverity, proactiveDispatch, virtualBatchingHubs, additionalFleetCount, closedCrossings, activeShock, selectedRouteKey, hazardSurcharge, inspectedZoneId]);

  return (
    <div className={styles.fullscreenContainer} ref={containerRef}>
      {/* ── 100% FULLSCREEN CANVAS MAP ── */}
      <canvas
        ref={canvasRef}
        className={styles.fullscreenCanvas}
        onClick={handleCanvasClick}
        title="Click any TLC Zone to inspect live telemetry"
      />

      {/* ── TOP FLOATING BAR (GOOGLE MAPS STYLE) ── */}
      <div className={styles.floatingTopBar}>
        {/* Left Nav Pill */}
        <div className={styles.floatingPill}>
          <Link href="/" className={styles.backBtn}>
            <FaArrowLeft /> Analytics
          </Link>
          <div className={styles.appBrand}>
            <FaCity color="var(--color-blue)" /> The City Machine Arena v3.0
          </div>
        </div>

        {/* Center Live Lost Revenue Pill */}
        <div className={styles.lostRevenuePill}>
          <div className={styles.lostRevenueTitle}>Shadow Lost Revenue:</div>
          <div className={styles.lostRevenueVal}>
            -${formatNumber(Math.round(cumulativeLostRevenue))} USD
          </div>
        </div>

        {/* Right Playback Pill */}
        <div className={styles.playbackPill}>
          <button
            className={`${styles.controlBtn} ${isPlaying ? styles.controlBtnActive : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <><FaPause /> Pause</> : <><FaPlay /> Play</>}
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
            4x
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: 4 }}>
            ({liveMetrics.onlineAgents}/{liveMetrics.totalAgents} Online)
          </span>
        </div>
      </div>

      {/* ── TOP-RIGHT FLOATING TOOLBARS (TRANSLUCENT PILLS) ── */}
      <div className={styles.floatingRightToolbar}>
        {/* Persona Switcher Group */}
        <div className={styles.personaGroup}>
          <button
            className={`${styles.personaBtn} ${activePersona === 'fleet' ? styles.personaBtnActive : ''}`}
            onClick={() => { setActivePersona('fleet'); setIsDrawerCollapsed(false); }}
          >
            <FaTaxi /> Fleet Ops
          </button>
          <button
            className={`${styles.personaBtn} ${activePersona === 'pricing' ? styles.personaBtnActive : ''}`}
            onClick={() => { setActivePersona('pricing'); setIsDrawerCollapsed(false); }}
          >
            <FaBolt /> Pricing Arena
          </button>
          <button
            className={`${styles.personaBtn} ${activePersona === 'fatigue' ? styles.personaBtnActive : ''}`}
            onClick={() => { setActivePersona('fatigue'); setIsDrawerCollapsed(false); }}
          >
            <FaBatteryHalf /> Fatigue &amp; Subsidy
          </button>
          <button
            className={`${styles.personaBtn} ${activePersona === 'micro_surge' ? styles.personaBtnActive : ''}`}
            onClick={() => { setActivePersona('micro_surge'); setIsDrawerCollapsed(false); }}
          >
            <FaTrafficLight /> Micro-Surge &amp; Shocks
          </button>
        </div>

        {/* Borough Quick Filter Pills */}
        <div className={styles.boroughPillsGroup}>
          {(['ALL', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'] as const).map(b => (
            <button
              key={b}
              className={`${styles.boroughBtn} ${selectedBoroughFilter === b ? styles.boroughBtnActive : ''}`}
              onClick={() => setSelectedBoroughFilter(b)}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* ── FLOATING LEFT COCKPIT DRAWER (GOOGLE MAPS CARD) ── */}
      <div className={styles.floatingLeftCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            {activePersona === 'fleet' && <><FaTaxi color="var(--color-blue)" /> Fleet Operations &amp; Forward Staging</>}
            {activePersona === 'pricing' && <><FaBolt color="var(--color-blue)" /> Dynamic Surge Pricing &amp; Elasticity</>}
            {activePersona === 'fatigue' && <><FaBatteryHalf color="var(--color-blue)" /> Driver Fatigue &amp; Jam Subsidy</>}
            {activePersona === 'micro_surge' && <><FaTrafficLight color="var(--color-blue)" /> Micro-Surge Yield &amp; Urban Shocks</>}
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
            title={isDrawerCollapsed ? 'Expand Controls' : 'Minimize Controls'}
          >
            {isDrawerCollapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>

        {!isDrawerCollapsed && (
          <>
            {/* ── TAB 1: FLEET OPS ── */}
            {activePersona === 'fleet' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Scenario Preset</label>
                  <select
                    className={styles.select}
                    value={selectedScenario}
                    onChange={e => setSelectedScenario(e.target.value as any)}
                  >
                    <option value="penn_rain">Penn Station Severe Storm Egress (High Transit Spillover)</option>
                    <option value="jfk_surge">JFK International Airport Surge &amp; Outer-Borough Deadhead</option>
                    <option value="lic_starvation">Long Island City Boundary Starvation (Bridge Deficit)</option>
                    <option value="yankee_egress">Yankee Stadium Post-Game Surge (Rapid Outflow Egress)</option>
                  </select>
                </div>

                <div className={styles.toggleRow}>
                  <div className={styles.toggleLabel}>
                    <span className={styles.toggleTitle}>Proactive Dispatch (-20 min Staging)</span>
                    <span className={styles.toggleSub}>Forward-stage vacant vehicles ($3.50 subsidy)</span>
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
                    <span className={styles.toggleSub}>Consolidate queues at sheltered transit hubs</span>
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
                    <div className={styles.kpiLabel}>Customer Wait ETA</div>
                    <div className={styles.kpiValue} style={{ color: proactiveDispatch ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {liveMetrics.avgWaitTimeMin.toFixed(1)}m
                    </div>
                    <div className={styles.kpiSub}>{proactiveDispatch ? '-72% reduction' : 'Elevated storm queuing'}</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Dispatch ROI</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--color-green)' }}>
                      {liveMetrics.operationalRoi.toFixed(1)}x
                    </div>
                    <div className={styles.kpiSub}>+{formatCurrency(liveMetrics.grossRevenueUplift)} GMV uplift</div>
                  </div>
                </div>

                <div className={styles.recommendationBox}>
                  <FaCheckCircle style={{ marginRight: 4 }} />
                  <strong>Operations Recommendation:</strong> Forward staging with virtual hubs clears bottlenecks <strong>68% faster</strong> with a <strong>{liveMetrics.operationalRoi.toFixed(1)}x ROI</strong>.
                </div>
              </>
            )}

            {/* ── TAB 2: PRICING ARENA ── */}
            {activePersona === 'pricing' && (
              <>
                <div className={styles.formGroup}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Surge Multiplier (P_rider)</label>
                    <span className={styles.rangeValue} style={{ fontSize: '1.1rem', color: surgeMultiplier > 2.0 ? 'var(--color-red)' : 'var(--color-green)' }}>
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
                    <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>1.8x Sweet Spot</span>
                    <span style={{ color: 'var(--color-red)' }}>3.0x Drop-Off</span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Weather Severity</label>
                  <select
                    className={styles.select}
                    value={weatherSeverity}
                    onChange={e => setWeatherSeverity(e.target.value as any)}
                  >
                    <option value="clear">Clear Skies (Baseline demand)</option>
                    <option value="moderate">Moderate Rain (1.4x demand)</option>
                    <option value="heavy_storm">Severe Flood Storm (2.3x demand spike)</option>
                  </select>
                </div>

                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Projected GMV</div>
                    <div className={styles.kpiValue} style={{ color: surgeMultiplier <= 1.8 ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {formatCurrency(liveMetrics.totalGmv)}
                    </div>
                    <div className={styles.kpiSub}>Take: {formatCurrency(liveMetrics.platformRevenue)}</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Conversion Rate</div>
                    <div className={styles.kpiValue} style={{ color: liveMetrics.conversionRate > 50 ? 'var(--color-blue)' : 'var(--color-red)' }}>
                      {liveMetrics.conversionRate.toFixed(1)}%
                    </div>
                    <div className={styles.kpiSub}>{surgeMultiplier > 2.0 ? 'Elevated drop-off' : 'High liquidity'}</div>
                  </div>
                </div>
              </>
            )}

            {/* ── TAB 3: FATIGUE & SUBSIDY ── */}
            {activePersona === 'fatigue' && (
              <>
                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Active Online Fleet</div>
                    <div className={styles.kpiValue} style={{ color: liveMetrics.fleetOnlinePct > 70 ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {liveMetrics.fleetOnlinePct}%
                    </div>
                    <div className={styles.kpiSub}>{liveMetrics.onlineAgents}/{liveMetrics.totalAgents} active cars</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Avg Driver Stamina</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--color-blue)' }}>
                      {liveMetrics.avgStamina}%
                    </div>
                    <div className={styles.kpiSub}>Fatigue churn resilience</div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Traffic Jam Relief Subsidy</label>
                    <span className={styles.rangeValue}>+${trafficJamSubsidy.toFixed(2)} / 15 min</span>
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
                </div>

                <div className={styles.recommendationBox}>
                  <FaLightbulb style={{ marginRight: 4, color: 'var(--color-amber)' }} />
                  <strong>Retention Policy:</strong> A <strong>${trafficJamSubsidy.toFixed(2)} relief subsidy</strong> retains <strong>{liveMetrics.fleetOnlinePct}% of drivers</strong> during severe storm gridlocks.
                </div>
              </>
            )}

            {/* ── TAB 4: MICRO-SURGE & SHOCKS ── */}
            {activePersona === 'micro_surge' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Urban Shock Triggers</label>
                  <div className={styles.shockGrid}>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'msg_concert' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'msg_concert' ? 'none' : 'msg_concert')}
                    >
                      <FaMusic color="var(--color-red)" /> MSG (+300% Demand)
                    </button>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'lincoln_accident' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'lincoln_accident' ? 'none' : 'lincoln_accident')}
                    >
                      <FaTrafficLight color="var(--color-amber)" /> Lincoln Crash (-65% Speed)
                    </button>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'gas_price_spike' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'gas_price_spike' ? 'none' : 'gas_price_spike')}
                    >
                      <FaGasPump color="var(--color-blue)" /> Fuel Spike (+25% Cost)
                    </button>
                    <button
                      className={`${styles.shockBtn} ${activeShock === 'flash_flood' ? styles.shockBtnActive : ''}`}
                      onClick={() => setActiveShock(activeShock === 'flash_flood' ? 'none' : 'flash_flood')}
                    >
                      <FaWater color="var(--color-purple)" /> Bridge Flood Lockout
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.rangeHeader}>
                    <label className={styles.label}>Corridor Hazard Surcharge</label>
                    <span className={styles.rangeValue}>+${hazardSurcharge.toFixed(2)}</span>
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

                <div className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Corridor Yield</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--color-blue)' }}>
                      ${liveMetrics.expectedYieldPerMin.toFixed(2)}/m
                    </div>
                  </div>
                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Acceptance Rate</div>
                    <div className={styles.kpiValue} style={{ color: liveMetrics.routeAcceptanceRate > 70 ? 'var(--color-green)' : 'var(--color-red)' }}>
                      {liveMetrics.routeAcceptanceRate}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── FLOATING ZONE INSPECTOR CARD (BOTTOM RIGHT) ── */}
      {liveMetrics.activeZone && (
        <div className={styles.floatingZoneCard}>
          <div className={styles.zoneHeader}>
            <div className={styles.zoneTitle}>
              <FaSearchLocation color="var(--color-blue)" /> {liveMetrics.activeZone.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={styles.zoneBoroughBadge}>{liveMetrics.activeZone.borough}</span>
              <button
                onClick={() => setInspectedZoneId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
                title="Close Inspector"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          <div className={styles.zoneGrid}>
            <div className={styles.zoneMetricItem}>
              <span className={styles.zoneMetricLabel}>Poisson Demand (λ)</span>
              <span className={styles.zoneMetricVal} style={{ color: 'var(--color-blue)' }}>
                {liveMetrics.zonePoissonDemand} req/m
              </span>
            </div>

            <div className={styles.zoneMetricItem}>
              <span className={styles.zoneMetricLabel}>Local Supply</span>
              <span className={styles.zoneMetricVal} style={{ color: liveMetrics.zoneActiveVehicles > 5 ? 'var(--color-green)' : 'var(--color-red)' }}>
                {liveMetrics.zoneActiveVehicles} cars
              </span>
            </div>

            <div className={styles.zoneMetricItem}>
              <span className={styles.zoneMetricLabel}>Unmet Deficit</span>
              <span className={styles.zoneMetricVal} style={{ color: liveMetrics.zoneDeficit > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                {liveMetrics.zoneDeficit} unserved
              </span>
            </div>

            <div className={styles.zoneMetricItem}>
              <span className={styles.zoneMetricLabel}>Average Fare</span>
              <span className={styles.zoneMetricVal}>
                ${liveMetrics.activeZone.avgFare.toFixed(2)}
              </span>
            </div>

            <div className={styles.zoneMetricItem}>
              <span className={styles.zoneMetricLabel}>Lost Rev Rate</span>
              <span className={styles.zoneMetricVal} style={{ color: 'var(--color-red)' }}>
                -${liveMetrics.zoneLostRevenueRate}/hr
              </span>
            </div>

            <div className={styles.zoneMetricItem}>
              <span className={styles.zoneMetricLabel}>Surge Factor</span>
              <span className={styles.zoneMetricVal} style={{ color: 'var(--color-purple)' }}>
                {(surgeMultiplier * (liveMetrics.zoneDeficit > 20 ? 1.3 : 1.0)).toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BOTTOM LEGEND (BOTTOM LEFT) ── */}
      <div className={styles.floatingLegend}>
        <div><span className={styles.legendDot} style={{ background: '#10b981' }} /> In-Trip (Revenue)</div>
        <div><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Cruising (Deadhead)</div>
        <div><span className={styles.legendDot} style={{ background: '#ef4444' }} /> Delayed / Flooded</div>
        <div><span className={styles.legendDot} style={{ background: '#2563eb' }} /> Forward Staged</div>
      </div>
    </div>
  );
}





