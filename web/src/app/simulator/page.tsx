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
  FaPlus,
  FaMinus,
  FaCrosshairs,
  FaClock,
  FaFire,
  FaCar,
} from 'react-icons/fa';
import styles from './simulator.module.css';

// ── 1. Comprehensive 55 Granular NYC TLC Zones with Official TLC IDs ─────────
export interface ZoneDef {
  id: string;
  tlcLocationId: number;
  name: string;
  shortName: string;
  nx: number;
  ny: number;
  borough: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island';
  baseLambda: number; // Poisson arrivals per minute
  avgFare: number;
}

export const NYC_55_TLC_ZONES: Record<string, ZoneDef> = {
  // ── MANHATTAN (19 Zones) ──
  inwood: { id: 'inwood', tlcLocationId: 127, name: 'Inwood / Fort Tryon', shortName: 'Inwood #127', nx: 0.38, ny: 0.10, borough: 'Manhattan', baseLambda: 35, avgFare: 22.0 },
  wash_hts: { id: 'wash_hts', tlcLocationId: 244, name: 'Washington Heights North/South', shortName: 'Wash Hts #244', nx: 0.39, ny: 0.15, borough: 'Manhattan', baseLambda: 55, avgFare: 21.5 },
  harlem_n: { id: 'harlem_n', tlcLocationId: 116, name: 'Central Harlem North', shortName: 'Harlem N #116', nx: 0.40, ny: 0.20, borough: 'Manhattan', baseLambda: 85, avgFare: 18.5 },
  morningside: { id: 'morningside', tlcLocationId: 166, name: 'Morningside Heights / Columbia', shortName: 'Columbia #166', nx: 0.36, ny: 0.24, borough: 'Manhattan', baseLambda: 60, avgFare: 17.5 },
  east_harlem: { id: 'east_harlem', tlcLocationId: 74, name: 'East Harlem / El Barrio', shortName: 'E. Harlem #74', nx: 0.44, ny: 0.23, borough: 'Manhattan', baseLambda: 70, avgFare: 17.0 },
  ues_north: { id: 'ues_north', tlcLocationId: 236, name: 'Upper East Side North / Yorkville', shortName: 'UES North #236', nx: 0.45, ny: 0.29, borough: 'Manhattan', baseLambda: 165, avgFare: 16.5 },
  ues_south: { id: 'ues_south', tlcLocationId: 237, name: 'Upper East Side South / Lenox Hill', shortName: 'UES South #237', nx: 0.44, ny: 0.35, borough: 'Manhattan', baseLambda: 195, avgFare: 16.8 },
  uws_north: { id: 'uws_north', tlcLocationId: 238, name: 'Upper West Side North', shortName: 'UWS North #238', nx: 0.35, ny: 0.28, borough: 'Manhattan', baseLambda: 130, avgFare: 17.2 },
  uws_south: { id: 'uws_south', tlcLocationId: 239, name: 'Upper West Side South / Lincoln Ctr', shortName: 'UWS South #239', nx: 0.36, ny: 0.34, borough: 'Manhattan', baseLambda: 160, avgFare: 17.4 },
  midtown_w: { id: 'midtown_w', tlcLocationId: 230, name: 'Times Sq / Theatre District', shortName: 'Times Sq #230', nx: 0.38, ny: 0.41, borough: 'Manhattan', baseLambda: 380, avgFare: 29.0 },
  midtown_c: { id: 'midtown_c', tlcLocationId: 161, name: 'Midtown Center / Grand Central', shortName: 'Midtown C #161', nx: 0.41, ny: 0.43, borough: 'Manhattan', baseLambda: 420, avgFare: 24.5 },
  midtown_s: { id: 'midtown_s', tlcLocationId: 162, name: 'Penn Station / Madison Sq West', shortName: 'Penn Sta #162', nx: 0.38, ny: 0.47, borough: 'Manhattan', baseLambda: 390, avgFare: 19.8 },
  murray_hill: { id: 'murray_hill', tlcLocationId: 170, name: 'Murray Hill / Kips Bay', shortName: 'Murray Hill #170', nx: 0.43, ny: 0.48, borough: 'Manhattan', baseLambda: 175, avgFare: 18.2 },
  chelsea: { id: 'chelsea', tlcLocationId: 48, name: 'Chelsea / High Line / Meatpacking', shortName: 'Chelsea #48', nx: 0.35, ny: 0.54, borough: 'Manhattan', baseLambda: 240, avgFare: 21.0 },
  gramercy: { id: 'gramercy', tlcLocationId: 107, name: 'Gramercy / Flatiron / Union Sq', shortName: 'Gramercy #107', nx: 0.40, ny: 0.55, borough: 'Manhattan', baseLambda: 260, avgFare: 20.5 },
  east_village: { id: 'east_village', tlcLocationId: 79, name: 'East Village / Alphabet City', shortName: 'E. Village #79', nx: 0.42, ny: 0.62, borough: 'Manhattan', baseLambda: 230, avgFare: 18.5 },
  west_village: { id: 'west_village', tlcLocationId: 246, name: 'Greenwich Village / West Village', shortName: 'W. Village #246', nx: 0.35, ny: 0.62, borough: 'Manhattan', baseLambda: 245, avgFare: 20.8 },
  soho_tribeca: { id: 'soho_tribeca', tlcLocationId: 249, name: 'SoHo / Tribeca / Hudson Sq', shortName: 'SoHo/Tribeca #249', nx: 0.34, ny: 0.68, borough: 'Manhattan', baseLambda: 270, avgFare: 25.0 },
  lower_east: { id: 'lower_east', tlcLocationId: 148, name: 'Lower East Side / Chinatown', shortName: 'LES #148', nx: 0.40, ny: 0.69, borough: 'Manhattan', baseLambda: 185, avgFare: 19.5 },
  fidi: { id: 'fidi', tlcLocationId: 87, name: 'Financial District / Wall St / Battery', shortName: 'FiDi #87', nx: 0.34, ny: 0.76, borough: 'Manhattan', baseLambda: 290, avgFare: 26.0 },

  // ── BROOKLYN (13 Zones) ──
  greenpoint: { id: 'greenpoint', tlcLocationId: 112, name: 'Greenpoint', shortName: 'Greenpoint #112', nx: 0.51, ny: 0.49, borough: 'Brooklyn', baseLambda: 110, avgFare: 21.0 },
  williamsburg_n: { id: 'williamsburg_n', tlcLocationId: 255, name: 'Williamsburg North (Bedford Ave)', shortName: 'W-Burg N #255', nx: 0.49, ny: 0.55, borough: 'Brooklyn', baseLambda: 190, avgFare: 21.8 },
  williamsburg_s: { id: 'williamsburg_s', tlcLocationId: 256, name: 'Williamsburg South (Broadway)', shortName: 'W-Burg S #256', nx: 0.53, ny: 0.58, borough: 'Brooklyn', baseLambda: 155, avgFare: 20.4 },
  dumbo: { id: 'dumbo', tlcLocationId: 89, name: 'DUMBO / Vinegar Hill', shortName: 'DUMBO #89', nx: 0.42, ny: 0.72, borough: 'Brooklyn', baseLambda: 125, avgFare: 23.5 },
  bk_heights: { id: 'bk_heights', tlcLocationId: 25, name: 'Brooklyn Heights / Cobble Hill', shortName: 'BK Heights #25', nx: 0.40, ny: 0.75, borough: 'Brooklyn', baseLambda: 135, avgFare: 22.0 },
  downtown_bk: { id: 'downtown_bk', tlcLocationId: 65, name: 'Downtown Brooklyn / MetroTech', shortName: 'Downtown BK #65', nx: 0.44, ny: 0.76, borough: 'Brooklyn', baseLambda: 210, avgFare: 21.5 },
  atlantic_hub: { id: 'atlantic_hub', tlcLocationId: 66, name: 'Atlantic Terminal / Barclays Ctr', shortName: 'Barclays Hub #66', nx: 0.48, ny: 0.76, borough: 'Brooklyn', baseLambda: 245, avgFare: 22.5 },
  bushwick_w: { id: 'bushwick_w', tlcLocationId: 36, name: 'Bushwick West / Morgan Ave', shortName: 'Bushwick W #36', nx: 0.58, ny: 0.60, borough: 'Brooklyn', baseLambda: 115, avgFare: 20.0 },
  bushwick_e: { id: 'bushwick_e', tlcLocationId: 37, name: 'Bushwick East / Myrtle Ave', shortName: 'Bushwick E #37', nx: 0.65, ny: 0.63, borough: 'Brooklyn', baseLambda: 90, avgFare: 19.5 },
  bed_stuy: { id: 'bed_stuy', tlcLocationId: 17, name: 'Bedford-Stuyvesant (Fulton St)', shortName: 'Bed-Stuy #17', nx: 0.54, ny: 0.73, borough: 'Brooklyn', baseLambda: 130, avgFare: 19.2 },
  crown_heights: { id: 'crown_heights', tlcLocationId: 61, name: 'Crown Heights North / Eastern Pkwy', shortName: 'Crown Hts #61', nx: 0.55, ny: 0.81, borough: 'Brooklyn', baseLambda: 120, avgFare: 19.0 },
  park_slope: { id: 'park_slope', tlcLocationId: 181, name: 'Park Slope / Prospect Park West', shortName: 'Park Slope #181', nx: 0.46, ny: 0.83, borough: 'Brooklyn', baseLambda: 145, avgFare: 22.8 },
  bay_ridge: { id: 'bay_ridge', tlcLocationId: 14, name: 'Bay Ridge / Fort Hamilton', shortName: 'Bay Ridge #14', nx: 0.40, ny: 0.94, borough: 'Brooklyn', baseLambda: 65, avgFare: 30.5 },

  // ── QUEENS (12 Zones) ──
  astoria_n: { id: 'astoria_n', tlcLocationId: 7, name: 'Astoria North / Ditmars Blvd', shortName: 'Astoria N #7', nx: 0.55, ny: 0.28, borough: 'Queens', baseLambda: 120, avgFare: 21.0 },
  astoria_s: { id: 'astoria_s', tlcLocationId: 8, name: 'Astoria South / Broadway', shortName: 'Astoria S #8', nx: 0.53, ny: 0.35, borough: 'Queens', baseLambda: 140, avgFare: 21.5 },
  lic_hunters: { id: 'lic_hunters', tlcLocationId: 146, name: 'Long Island City / Hunters Point', shortName: 'Queens LIC #146', nx: 0.50, ny: 0.44, borough: 'Queens', baseLambda: 190, avgFare: 22.8 },
  sunnyside: { id: 'sunnyside', tlcLocationId: 226, name: 'Sunnyside / Woodside', shortName: 'Sunnyside #226', nx: 0.59, ny: 0.44, borough: 'Queens', baseLambda: 110, avgFare: 21.0 },
  lga_airport: { id: 'lga_airport', tlcLocationId: 138, name: 'LaGuardia Airport (LGA Terminal A/B/C)', shortName: 'LGA Airport #138', nx: 0.69, ny: 0.24, borough: 'Queens', baseLambda: 280, avgFare: 44.0 },
  corona: { id: 'corona', tlcLocationId: 56, name: 'Corona / Jackson Heights', shortName: 'Jackson Hts #56', nx: 0.67, ny: 0.36, borough: 'Queens', baseLambda: 125, avgFare: 22.0 },
  flushing: { id: 'flushing', tlcLocationId: 93, name: 'Flushing Main St / Citi Field', shortName: 'Flushing #93', nx: 0.78, ny: 0.30, borough: 'Queens', baseLambda: 155, avgFare: 26.5 },
  middle_village: { id: 'middle_village', tlcLocationId: 157, name: 'Middle Village / Maspeth', shortName: 'Maspeth #157', nx: 0.62, ny: 0.50, borough: 'Queens', baseLambda: 75, avgFare: 22.0 },
  forest_hills: { id: 'forest_hills', tlcLocationId: 101, name: 'Forest Hills / Austin St', shortName: 'Forest Hills #101', nx: 0.70, ny: 0.50, borough: 'Queens', baseLambda: 115, avgFare: 23.5 },
  kew_gardens: { id: 'kew_gardens', tlcLocationId: 134, name: 'Kew Gardens / Queens Blvd', shortName: 'Kew Gardens #134', nx: 0.75, ny: 0.58, borough: 'Queens', baseLambda: 95, avgFare: 24.0 },
  jamaica_center: { id: 'jamaica_center', tlcLocationId: 130, name: 'Jamaica Center / AirTrain LIRR Hub', shortName: 'Jamaica Hub #130', nx: 0.82, ny: 0.62, borough: 'Queens', baseLambda: 170, avgFare: 28.5 },
  jfk_airport: { id: 'jfk_airport', tlcLocationId: 132, name: 'JFK International Airport (Terminals 1-8)', shortName: 'JFK Airport #132', nx: 0.86, ny: 0.82, borough: 'Queens', baseLambda: 380, avgFare: 74.0 },

  // ── BRONX (6 Zones) ──
  riverdale: { id: 'riverdale', tlcLocationId: 200, name: 'Riverdale / Spuyten Duyvil', shortName: 'Riverdale #200', nx: 0.41, ny: 0.05, borough: 'Bronx', baseLambda: 30, avgFare: 24.5 },
  kingsbridge: { id: 'kingsbridge', tlcLocationId: 137, name: 'Kingsbridge / Marble Hill', shortName: 'Kingsbridge #137', nx: 0.43, ny: 0.09, borough: 'Bronx', baseLambda: 45, avgFare: 21.0 },
  yankee_stadium: { id: 'yankee_stadium', tlcLocationId: 233, name: 'Yankee Stadium / Grand Concourse', shortName: 'Yankee Hub #233', nx: 0.46, ny: 0.12, borough: 'Bronx', baseLambda: 95, avgFare: 22.0 },
  mott_haven: { id: 'mott_haven', tlcLocationId: 168, name: 'Mott Haven / Port Morris Hub', shortName: 'Mott Haven #168', nx: 0.52, ny: 0.16, borough: 'Bronx', baseLambda: 60, avgFare: 19.5 },
  hunts_point: { id: 'hunts_point', tlcLocationId: 119, name: 'Hunts Point Wholesale Market', shortName: 'Hunts Point #119', nx: 0.60, ny: 0.16, borough: 'Bronx', baseLambda: 50, avgFare: 20.0 },
  fordham: { id: 'fordham', tlcLocationId: 94, name: 'Fordham / Belmont Arthur Ave', shortName: 'Fordham #94', nx: 0.50, ny: 0.08, borough: 'Bronx', baseLambda: 70, avgFare: 21.0 },

  // ── STATEN ISLAND & GATEWAY (3 Zones) ──
  st_george: { id: 'st_george', tlcLocationId: 214, name: 'St. George Ferry Terminal (SI)', shortName: 'St. George #214', nx: 0.24, ny: 0.88, borough: 'Staten Island', baseLambda: 50, avgFare: 36.0 },
  west_brighton: { id: 'west_brighton', tlcLocationId: 251, name: 'West New Brighton / Castleton Ave', shortName: 'W. Brighton #251', nx: 0.18, ny: 0.92, borough: 'Staten Island', baseLambda: 35, avgFare: 34.0 },
  ewr_gateway: { id: 'ewr_gateway', tlcLocationId: 1, name: 'Newark Airport / NJ Gateway (I-78)', shortName: 'NJ/EWR Gateway #1', nx: 0.18, ny: 0.56, borough: 'Manhattan', baseLambda: 85, avgFare: 58.0 },
};

// ── 2. Real Arterial & River-Crossing Edge Network with BPR Flow Capacities ──
export interface EdgeGraphDef {
  id: string;
  from: string;
  to: string;
  name: string;
  isCrossing: boolean;
  distanceMiles: number;
  freeFlowSpeedMph: number;
  capacityPerHour: number; // For BPR Link Delay calculation
}

export const NYC_50_EDGES: EdgeGraphDef[] = [
  // Bronx Spines
  { id: 'bx_spine_1', from: 'riverdale', to: 'kingsbridge', name: 'Henry Hudson Pkwy', isCrossing: false, distanceMiles: 1.8, freeFlowSpeedMph: 35, capacityPerHour: 3200 },
  { id: 'bx_spine_2', from: 'kingsbridge', to: 'fordham', name: 'Fordham Road Express', isCrossing: false, distanceMiles: 1.6, freeFlowSpeedMph: 20, capacityPerHour: 2200 },
  { id: 'bx_spine_3', from: 'fordham', to: 'yankee_stadium', name: 'Grand Concourse Spine', isCrossing: false, distanceMiles: 2.1, freeFlowSpeedMph: 24, capacityPerHour: 2800 },
  { id: 'bx_spine_4', from: 'yankee_stadium', to: 'mott_haven', name: 'Major Deegan South (I-87)', isCrossing: false, distanceMiles: 1.9, freeFlowSpeedMph: 32, capacityPerHour: 3600 },
  { id: 'bx_spine_5', from: 'mott_haven', to: 'hunts_point', name: 'Bruckner Expressway (I-278)', isCrossing: false, distanceMiles: 2.4, freeFlowSpeedMph: 35, capacityPerHour: 3800 },

  // Bronx <-> Manhattan Crossings
  { id: 'macombs_bridge', from: 'yankee_stadium', to: 'wash_hts', name: 'Macombs Dam Bridge', isCrossing: true, distanceMiles: 1.1, freeFlowSpeedMph: 18, capacityPerHour: 2400 },
  { id: 'broadway_bridge', from: 'kingsbridge', to: 'inwood', name: 'Broadway Bridge', isCrossing: true, distanceMiles: 0.8, freeFlowSpeedMph: 16, capacityPerHour: 1800 },
  { id: 'willis_bridge', from: 'mott_haven', to: 'harlem_n', name: 'Willis Ave / 3rd Ave Bridge', isCrossing: true, distanceMiles: 1.0, freeFlowSpeedMph: 16, capacityPerHour: 2200 },
  { id: 'triboro_bx_qns', from: 'mott_haven', to: 'astoria_n', name: 'RFK Triborough (Bronx-Queens)', isCrossing: true, distanceMiles: 2.3, freeFlowSpeedMph: 38, capacityPerHour: 4200 },

  // Upper Manhattan Corridor
  { id: 'manh_spine_1', from: 'inwood', to: 'wash_hts', name: 'Broadway Inwood Spine', isCrossing: false, distanceMiles: 1.5, freeFlowSpeedMph: 18, capacityPerHour: 1800 },
  { id: 'manh_spine_2', from: 'wash_hts', to: 'harlem_n', name: 'St. Nicholas Ave Corridor', isCrossing: false, distanceMiles: 1.8, freeFlowSpeedMph: 16, capacityPerHour: 1600 },
  { id: 'manh_spine_3', from: 'harlem_n', to: 'morningside', name: '125th St Martin Luther King Blvd', isCrossing: false, distanceMiles: 1.2, freeFlowSpeedMph: 14, capacityPerHour: 1500 },
  { id: 'manh_spine_4', from: 'harlem_n', to: 'east_harlem', name: '116th St Corridor', isCrossing: false, distanceMiles: 1.1, freeFlowSpeedMph: 14, capacityPerHour: 1400 },
  { id: 'manh_spine_5', from: 'morningside', to: 'uws_north', name: 'Broadway Columbia Spine', isCrossing: false, distanceMiles: 1.4, freeFlowSpeedMph: 15, capacityPerHour: 1600 },
  { id: 'manh_spine_6', from: 'east_harlem', to: 'ues_north', name: '2nd Ave / FDR North', isCrossing: false, distanceMiles: 1.5, freeFlowSpeedMph: 22, capacityPerHour: 2800 },

  // Central Park & Midtown Core
  { id: 'manh_spine_7', from: 'uws_north', to: 'uws_south', name: 'Columbus / Amsterdam Aves', isCrossing: false, distanceMiles: 1.5, freeFlowSpeedMph: 14, capacityPerHour: 1600 },
  { id: 'manh_spine_8', from: 'ues_north', to: 'ues_south', name: '5th Ave / Madison / Park Aves', isCrossing: false, distanceMiles: 1.6, freeFlowSpeedMph: 13, capacityPerHour: 1800 },
  { id: 'manh_spine_9', from: 'uws_south', to: 'midtown_w', name: 'Broadway / 8th Ave Midtown', isCrossing: false, distanceMiles: 1.4, freeFlowSpeedMph: 11, capacityPerHour: 1600 },
  { id: 'manh_spine_10', from: 'ues_south', to: 'midtown_c', name: 'Park Ave / Lexington Midtown', isCrossing: false, distanceMiles: 1.5, freeFlowSpeedMph: 10, capacityPerHour: 1700 },
  { id: 'midtown_cross_1', from: 'midtown_w', to: 'midtown_c', name: '42nd St Crosstown Spine', isCrossing: false, distanceMiles: 0.8, freeFlowSpeedMph: 8, capacityPerHour: 1200 },
  { id: 'midtown_cross_2', from: 'midtown_c', to: 'murray_hill', name: '34th St Herald Sq Corridor', isCrossing: false, distanceMiles: 0.9, freeFlowSpeedMph: 9, capacityPerHour: 1300 },
  { id: 'midtown_cross_3', from: 'midtown_w', to: 'midtown_s', name: '7th Ave Penn Station Spine', isCrossing: false, distanceMiles: 0.7, freeFlowSpeedMph: 9, capacityPerHour: 1400 },
  { id: 'midtown_cross_4', from: 'midtown_s', to: 'murray_hill', name: '34th St Empire State Corridor', isCrossing: false, distanceMiles: 0.8, freeFlowSpeedMph: 9, capacityPerHour: 1200 },

  // Lower Manhattan Spines
  { id: 'manh_spine_11', from: 'midtown_s', to: 'chelsea', name: '8th Ave / 10th Ave Chelsea Spine', isCrossing: false, distanceMiles: 1.3, freeFlowSpeedMph: 12, capacityPerHour: 1500 },
  { id: 'manh_spine_12', from: 'murray_hill', to: 'gramercy', name: 'Park Ave South / Irving Pl', isCrossing: false, distanceMiles: 1.2, freeFlowSpeedMph: 11, capacityPerHour: 1400 },
  { id: 'manh_spine_13', from: 'chelsea', to: 'west_village', name: '7th Ave South / Bleeker St', isCrossing: false, distanceMiles: 1.2, freeFlowSpeedMph: 12, capacityPerHour: 1400 },
  { id: 'manh_spine_14', from: 'gramercy', to: 'east_village', name: '1st Ave / Avenue A Corridor', isCrossing: false, distanceMiles: 1.1, freeFlowSpeedMph: 12, capacityPerHour: 1400 },
  { id: 'manh_spine_15', from: 'west_village', to: 'soho_tribeca', name: 'Hudson St / West St Express', isCrossing: false, distanceMiles: 1.4, freeFlowSpeedMph: 16, capacityPerHour: 2000 },
  { id: 'manh_spine_16', from: 'east_village', to: 'lower_east', name: 'Essex St / Allen St Corridor', isCrossing: false, distanceMiles: 1.2, freeFlowSpeedMph: 12, capacityPerHour: 1400 },
  { id: 'manh_spine_17', from: 'soho_tribeca', to: 'fidi', name: 'West Side Hwy / Broadway FiDi', isCrossing: false, distanceMiles: 1.5, freeFlowSpeedMph: 18, capacityPerHour: 2400 },
  { id: 'manh_spine_18', from: 'lower_east', to: 'fidi', name: 'FDR Drive South / South St', isCrossing: false, distanceMiles: 1.4, freeFlowSpeedMph: 24, capacityPerHour: 2600 },

  // Gateway Tunnels
  { id: 'holland_tunnel', from: 'soho_tribeca', to: 'ewr_gateway', name: 'Holland Tunnel (I-78 Express)', isCrossing: true, distanceMiles: 3.8, freeFlowSpeedMph: 28, capacityPerHour: 3200 },
  { id: 'lincoln_tunnel', from: 'midtown_w', to: 'ewr_gateway', name: 'Lincoln Tunnel Express', isCrossing: true, distanceMiles: 3.6, freeFlowSpeedMph: 26, capacityPerHour: 3400 },

  // Manhattan <-> Queens Crossings
  { id: 'queensboro_bridge', from: 'ues_south', to: 'lic_hunters', name: 'Queensboro Bridge (59th St)', isCrossing: true, distanceMiles: 1.4, freeFlowSpeedMph: 18, capacityPerHour: 3600 },
  { id: 'midtown_tunnel', from: 'murray_hill', to: 'lic_hunters', name: 'Queens-Midtown Tunnel (I-495)', isCrossing: true, distanceMiles: 1.6, freeFlowSpeedMph: 24, capacityPerHour: 3400 },
  { id: 'triboro_manh_qns', from: 'east_harlem', to: 'astoria_s', name: 'RFK Triborough Manhattan Span', isCrossing: true, distanceMiles: 2.0, freeFlowSpeedMph: 35, capacityPerHour: 3800 },

  // Manhattan <-> Brooklyn Crossings
  { id: 'williamsburg_bridge', from: 'lower_east', to: 'williamsburg_s', name: 'Williamsburg Bridge (Delancey)', isCrossing: true, distanceMiles: 1.7, freeFlowSpeedMph: 20, capacityPerHour: 3400 },
  { id: 'manhattan_bridge', from: 'lower_east', to: 'dumbo', name: 'Manhattan Bridge (Canal St)', isCrossing: true, distanceMiles: 1.5, freeFlowSpeedMph: 18, capacityPerHour: 3200 },
  { id: 'brooklyn_bridge', from: 'fidi', to: 'bk_heights', name: 'Brooklyn Bridge (Park Row)', isCrossing: true, distanceMiles: 1.3, freeFlowSpeedMph: 16, capacityPerHour: 2800 },
  { id: 'si_ferry', from: 'fidi', to: 'st_george', name: 'Staten Island Ferry Maritime Transit', isCrossing: true, distanceMiles: 5.2, freeFlowSpeedMph: 18, capacityPerHour: 2000 },

  // Queens Spines & Airport Arteries
  { id: 'qns_spine_1', from: 'astoria_n', to: 'astoria_s', name: '31st St / Steinway Corridor', isCrossing: false, distanceMiles: 1.5, freeFlowSpeedMph: 18, capacityPerHour: 1800 },
  { id: 'qns_spine_2', from: 'astoria_s', to: 'lic_hunters', name: 'Northern Blvd / 21st St LIC', isCrossing: false, distanceMiles: 1.8, freeFlowSpeedMph: 20, capacityPerHour: 2200 },
  { id: 'qns_spine_3', from: 'astoria_n', to: 'lga_airport', name: 'Grand Central Pkwy LGA West', isCrossing: false, distanceMiles: 2.8, freeFlowSpeedMph: 32, capacityPerHour: 3800 },
  { id: 'qns_spine_4', from: 'lga_airport', to: 'flushing', name: 'Whitestone Expwy / Northern Blvd', isCrossing: false, distanceMiles: 2.7, freeFlowSpeedMph: 28, capacityPerHour: 3200 },
  { id: 'qns_spine_5', from: 'lic_hunters', to: 'sunnyside', name: 'Queens Blvd Western Spine', isCrossing: false, distanceMiles: 1.6, freeFlowSpeedMph: 20, capacityPerHour: 2400 },
  { id: 'qns_spine_6', from: 'sunnyside', to: 'corona', name: 'Roosevelt Ave / Queens Blvd', isCrossing: false, distanceMiles: 2.2, freeFlowSpeedMph: 20, capacityPerHour: 2200 },
  { id: 'qns_spine_7', from: 'corona', to: 'forest_hills', name: 'Long Island Expwy (LIE / I-495)', isCrossing: false, distanceMiles: 2.5, freeFlowSpeedMph: 35, capacityPerHour: 4500 },
  { id: 'qns_spine_8', from: 'forest_hills', to: 'kew_gardens', name: 'Union Turnpike / Queens Blvd', isCrossing: false, distanceMiles: 1.8, freeFlowSpeedMph: 24, capacityPerHour: 2800 },
  { id: 'qns_spine_9', from: 'kew_gardens', to: 'jamaica_center', name: 'Van Wyck Expressway (I-678)', isCrossing: false, distanceMiles: 2.6, freeFlowSpeedMph: 32, capacityPerHour: 3800 },
  { id: 'qns_spine_10', from: 'jamaica_center', to: 'jfk_airport', name: 'Van Wyck JFK Airport Spine', isCrossing: false, distanceMiles: 3.9, freeFlowSpeedMph: 40, capacityPerHour: 4200 },

  // Brooklyn Spines & Arteries
  { id: 'bk_spine_1', from: 'lic_hunters', to: 'greenpoint', name: 'Pulaski Bridge / McGuinness', isCrossing: true, distanceMiles: 1.4, freeFlowSpeedMph: 18, capacityPerHour: 2200 },
  { id: 'bk_spine_2', from: 'greenpoint', to: 'williamsburg_n', name: 'Bedford Ave North Corridor', isCrossing: false, distanceMiles: 1.3, freeFlowSpeedMph: 16, capacityPerHour: 1800 },
  { id: 'bk_spine_3', from: 'williamsburg_n', to: 'williamsburg_s', name: 'Grand St / Broadway W-Burg', isCrossing: false, distanceMiles: 1.1, freeFlowSpeedMph: 14, capacityPerHour: 1600 },
  { id: 'bk_spine_4', from: 'williamsburg_s', to: 'dumbo', name: 'Brooklyn-Queens Expwy (BQE / I-278)', isCrossing: false, distanceMiles: 2.4, freeFlowSpeedMph: 30, capacityPerHour: 3800 },
  { id: 'bk_spine_5', from: 'dumbo', to: 'bk_heights', name: 'Old Fulton St / Cadman Plaza', isCrossing: false, distanceMiles: 0.9, freeFlowSpeedMph: 14, capacityPerHour: 1400 },
  { id: 'bk_spine_6', from: 'bk_heights', to: 'downtown_bk', name: 'Court St / Atlantic Ave', isCrossing: false, distanceMiles: 1.0, freeFlowSpeedMph: 14, capacityPerHour: 1600 },
  { id: 'bk_spine_7', from: 'downtown_bk', to: 'atlantic_hub', name: 'Flatbush Ave / Fulton Mall', isCrossing: false, distanceMiles: 1.1, freeFlowSpeedMph: 12, capacityPerHour: 1600 },
  { id: 'bk_spine_8', from: 'williamsburg_s', to: 'bushwick_w', name: 'Flushing Ave / Bushwick Spine', isCrossing: false, distanceMiles: 2.0, freeFlowSpeedMph: 18, capacityPerHour: 2000 },
  { id: 'bk_spine_9', from: 'bushwick_w', to: 'bushwick_e', name: 'Myrtle Ave / Wyckoff Ave', isCrossing: false, distanceMiles: 1.6, freeFlowSpeedMph: 16, capacityPerHour: 1800 },
  { id: 'bk_spine_10', from: 'atlantic_hub', to: 'bed_stuy', name: 'Fulton St / Bedford Ave', isCrossing: false, distanceMiles: 1.8, freeFlowSpeedMph: 16, capacityPerHour: 2000 },
  { id: 'bk_spine_11', from: 'bed_stuy', to: 'crown_heights', name: 'Nostrand Ave / Eastern Pkwy', isCrossing: false, distanceMiles: 1.7, freeFlowSpeedMph: 18, capacityPerHour: 2200 },
  { id: 'bk_spine_12', from: 'atlantic_hub', to: 'park_slope', name: '4th Ave / Union St Slope', isCrossing: false, distanceMiles: 1.6, freeFlowSpeedMph: 18, capacityPerHour: 2200 },
  { id: 'bk_spine_13', from: 'park_slope', to: 'bay_ridge', name: 'Gowanus Expwy / Belt Pkwy West', isCrossing: false, distanceMiles: 4.2, freeFlowSpeedMph: 36, capacityPerHour: 4000 },
  { id: 'verrazzano_bridge', from: 'bay_ridge', to: 'st_george', name: 'Verrazzano-Narrows Bridge (I-278)', isCrossing: true, distanceMiles: 4.6, freeFlowSpeedMph: 45, capacityPerHour: 4800 },
  { id: 'belt_jfk_spine', from: 'crown_heights', to: 'jfk_airport', name: 'Belt Parkway Southern Shore Spine', isCrossing: false, distanceMiles: 6.8, freeFlowSpeedMph: 42, capacityPerHour: 4400 },
];

// ── 3. BPR Flow Delay Equation & Dijkstra Shortest Path Router Engine ────────
function computeBprTravelDuration(
  edge: EdgeGraphDef,
  currentVolume: number,
  weatherFactor: number,
  isClosed: boolean
): number {
  if (isClosed) return 999999;
  const baseDurationMin = (edge.distanceMiles / edge.freeFlowSpeedMph) * 60;
  const volumeRatio = Math.min(2.5, currentVolume / (edge.capacityPerHour * 0.15));
  // Standard Bureau of Public Roads (BPR) 4th-power congestion curve
  const congestionMultiplier = 1.0 + 0.15 * Math.pow(volumeRatio, 4);
  return baseDurationMin * congestionMultiplier * weatherFactor;
}

function buildAdjacencyList(
  closedCrossings: Record<string, boolean>,
  edgeVolumes: Record<string, number>,
  weatherFactor: number
) {
  const adj: Record<string, Array<{ to: string; edgeId: string; weight: number }>> = {};

  Object.keys(NYC_55_TLC_ZONES).forEach(nodeId => {
    adj[nodeId] = [];
  });

  NYC_50_EDGES.forEach(edge => {
    const isClosed = closedCrossings[edge.id];
    const volume = edgeVolumes[edge.id] || 80;
    const weight = computeBprTravelDuration(edge, volume, weatherFactor, isClosed);

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

  Object.keys(NYC_55_TLC_ZONES).forEach(nodeId => {
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

// ── 4. Autonomous Agent Model with Driver Utility & Reservation Wage ──────────
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
  cumulativeEarnings: number;
  shiftHours: number;
  reservationWagePerHour: number; // Reservation wage: quit if earning below this
}

interface RainParticle {
  x: number;
  y: number;
  length: number;
  speed: number;
}

export default function SimulatorPage() {
  const [baseData, setBaseData] = useState<SimulatorBase[]>([]);
  const [zonesData, setZonesData] = useState<ZoneRevenue[]>([]);
  const [surgeCurve, setSurgeCurve] = useState<SurgeElasticityPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Simulator Persona Navigation ────────────────────────────────────────────
  const [activePersona, setActivePersona] = useState<'fleet' | 'pricing' | 'fatigue' | 'micro_surge'>('fleet');
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState<boolean>(false);

  // ── Visualization Mode (Particles vs Heatmap) ──────────────────────────────
  const [viewMode, setViewMode] = useState<'particles' | 'heatmap'>('particles');

  // ── Camera Pan & Zoom State (Google Maps Style) ─────────────────────────────
  const [camera, setCamera] = useState<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1.0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── 24-Hour Diurnal Clock (0.0 to 24.0 hours) ──────────────────────────────
  const [timeOfDay, setTimeOfDay] = useState<number>(18.5); // Default 18:30 (Evening Rush)

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
  const [inspectedZoneId, setInspectedZoneId] = useState<string | null>('midtown_c');

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

  // ── Disruption Crossings State (Click-to-Block Arteries) ─────────────────────
  const [closedCrossings, setClosedCrossings] = useState<Record<string, boolean>>({
    queensboro_bridge: false,
    midtown_tunnel: true,
    williamsburg_bridge: false,
    holland_tunnel: false,
    verrazzano_bridge: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const agentsRef = useRef<MultiHopAgent[]>([]);
  const rainParticlesRef = useRef<RainParticle[]>([]);
  const edgeVolumesRef = useRef<Record<string, number>>({});

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

  // Precompute Adjacency List with BPR Link Capacities for Dijkstra Routing
  const graphAdjacency = useMemo(() => {
    return buildAdjacencyList(closedCrossings, edgeVolumesRef.current, weatherSpeedFactor);
  }, [closedCrossings, weatherSpeedFactor]);

  // Initialize 240 Multi-Hop Agents across 55 Granular TLC Zones
  useEffect(() => {
    const totalAgents = 240;
    const nodeKeys = Object.keys(NYC_55_TLC_ZONES);
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
        speed: 0.0035 + Math.random() * 0.0035,
        status: isTrip ? 'in_trip' : 'cruising',
        stamina: 75 + Math.random() * 25,
        profile,
        fare: 18 + Math.random() * 32,
        cumulativeEarnings: 45 + Math.random() * 80,
        shiftHours: 1.5 + Math.random() * 3.0,
        reservationWagePerHour: 18.50 + Math.random() * 4.0,
      });
    }
    agentsRef.current = initialAgents;

    // Initialize 140 Rain Particles
    const rainParticles: RainParticle[] = [];
    for (let i = 0; i < 140; i++) {
      rainParticles.push({
        x: Math.random() * 2000,
        y: Math.random() * 1500,
        length: 12 + Math.random() * 16,
        speed: 8 + Math.random() * 10,
      });
    }
    rainParticlesRef.current = rainParticles;
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

  // ── Helper to convert Normalized Coords (nx, ny) to Base Canvas Pixels ────
  const getCanvasCoords = (nx: number, ny: number, width: number, height: number) => {
    const padX = width * 0.07;
    const padY = height * 0.08;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    return {
      x: padX + nx * innerW,
      y: padY + ny * innerH,
    };
  };

  // ── Diurnal Time Multiplier (00:00 to 23:59) ──────────────────────────────
  const diurnalMultiplier = useMemo(() => {
    if (timeOfDay >= 7.5 && timeOfDay <= 9.5) return 1.75; // Morning peak
    if (timeOfDay >= 11.5 && timeOfDay <= 14.5) return 1.05; // Midday
    if (timeOfDay >= 17.0 && timeOfDay <= 20.5) return 2.35; // Evening peak
    if (timeOfDay >= 21.0 || timeOfDay <= 2.0) return 1.60; // Nightlife
    return 0.45; // Late night
  }, [timeOfDay]);

  // Formatted Time of Day string (e.g. "18:30 • Evening Rush")
  const formattedTimeStr = useMemo(() => {
    const totalMinutes = Math.round(timeOfDay * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    let label = 'Regular';
    if (hours >= 7 && hours <= 9) label = 'Morning Commute';
    else if (hours >= 17 && hours <= 20) label = 'Evening Rush';
    else if (hours >= 21 || hours <= 2) label = 'Nightlife Wave';
    else if (hours >= 3 && hours <= 6) label = 'Overnight Lull';
    return `${hh}:${mm} • ${label}`;
  }, [timeOfDay]);

  // ── Fullscreen Live Animation Loop with Batched Matching & BPR Flow ────────
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

      // ── Apply Camera Pan & Zoom Transform ─────────────────────────────────
      ctx.save();
      ctx.translate(w / 2 + camera.x * dpr, h / 2 + camera.y * dpr);
      ctx.scale(camera.scale, camera.scale);
      ctx.translate(-w / 2, -h / 2);

      // Subtle Water Arteries Background (Hudson & East Rivers)
      const hudsonCenter = getCanvasCoords(0.28, 0.48, w, h);
      const eastRiverCenter = getCanvasCoords(0.47, 0.52, w, h);

      ctx.fillStyle = 'rgba(219, 234, 254, 0.45)';
      ctx.beginPath();
      ctx.ellipse(hudsonCenter.x, hudsonCenter.y, w * 0.065, h * 0.48, -0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eastRiverCenter.x, eastRiverCenter.y, w * 0.048, h * 0.44, -0.28, 0, Math.PI * 2);
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

      // 1. Draw 50 Arterial Edges with BPR Link Congestion Colors
      NYC_50_EDGES.forEach(edge => {
        const fromNode = NYC_55_TLC_ZONES[edge.from];
        const toNode = NYC_55_TLC_ZONES[edge.to];
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
          ctx.lineWidth = 2.6 * dpr;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#cbd5e1'; // Clean slate arterial roads
          ctx.lineWidth = 1.8 * dpr;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (isClosed || isShocked) {
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;
          ctx.fillStyle = isClosed ? '#ef4444' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(midX, midY, 6.0 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${7.5 * dpr}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isClosed ? '✕' : '!', midX, midY);
        }
      });

      // ── DUAL VIEW: KERNEL DENSITY HEATMAP LAYER ───────────────────────────
      if (viewMode === 'heatmap') {
        Object.values(NYC_55_TLC_ZONES).forEach(node => {
          const pos = getCanvasCoords(node.nx, node.ny, w, h);
          const effectiveLambda = node.baseLambda * diurnalMultiplier * (weatherSeverity === 'heavy_storm' ? 2.1 : 1.0);
          const radius = Math.min(160, (effectiveLambda / 400) * 110 * dpr);

          const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.40)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.20)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. Pulse Rings on High-Demand Hubs & Shocks
      const pulseTime = Date.now() / 400;
      const pulseRadius = (15 + Math.sin(pulseTime) * 5) * dpr;

      if (proactiveDispatch) {
        const midtownPos = getCanvasCoords(NYC_55_TLC_ZONES.midtown_c.nx, NYC_55_TLC_ZONES.midtown_c.ny, w, h);
        ctx.beginPath();
        ctx.arc(midtownPos.x, midtownPos.y, pulseRadius + 8 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();
      }

      if (activeShock === 'msg_concert') {
        const midtownPos = getCanvasCoords(NYC_55_TLC_ZONES.midtown_s.nx, NYC_55_TLC_ZONES.midtown_s.ny, w, h);
        ctx.beginPath();
        ctx.arc(midtownPos.x, midtownPos.y, pulseRadius + 18 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
      }

      if (virtualBatchingHubs) {
        [NYC_55_TLC_ZONES.lic_hunters, NYC_55_TLC_ZONES.atlantic_hub, NYC_55_TLC_ZONES.jfk_airport].forEach(hub => {
          const hubPos = getCanvasCoords(hub.nx, hub.ny, w, h);
          ctx.beginPath();
          ctx.arc(hubPos.x, hubPos.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        });
      }

      // 3. Draw 55 Granular TLC Zone Nodes
      Object.values(NYC_55_TLC_ZONES).forEach(node => {
        const pos = getCanvasCoords(node.nx, node.ny, w, h);
        const isInspected = node.id === inspectedZoneId;
        const isFiltered = selectedBoroughFilter === 'ALL' || node.borough === selectedBoroughFilter;

        ctx.globalAlpha = isFiltered ? 1.0 : 0.20;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (isInspected ? 11 : 7) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.strokeStyle = isInspected
          ? '#2563eb'
          : (node.borough === 'Manhattan' ? '#3b82f6' : (node.borough === 'Brooklyn' ? '#10b981' : (node.borough === 'Queens' ? '#f59e0b' : '#8b5cf6')));
        ctx.lineWidth = (isInspected ? 2.8 : 1.8) * dpr;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (isInspected ? 3.5 : 2.5) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = isInspected ? '#2563eb' : '#64748b';
        ctx.fill();

        // Node Label with subtle halo
        if (camera.scale > 0.8 || isInspected || node.baseLambda > 200) {
          ctx.font = isInspected ? `bold ${10.5 * dpr}px Inter, sans-serif` : `600 ${8.5 * dpr}px Inter, sans-serif`;
          ctx.fillStyle = isInspected ? '#1d4ed8' : '#1e293b';
          ctx.textAlign = 'center';
          ctx.fillText(node.shortName, pos.x, pos.y - (isInspected ? 15 : 11) * dpr);
        }

        ctx.globalAlpha = 1.0;
      });

      // 4. Update and Draw Moving Multi-Hop Agents (Particle Mode)
      if (viewMode === 'particles') {
        const agents = agentsRef.current;
        const nodeKeys = Object.keys(NYC_55_TLC_ZONES);

        agents.forEach(agent => {
          if (agent.status === 'offline') return;

          if (isPlaying) {
            let currentSpeed = agent.speed * simSpeed;
            if (weatherSeverity === 'heavy_storm') currentSpeed *= 0.65;
            if (activeShock === 'gas_price_spike') currentSpeed *= 0.85;

            const edge = NYC_50_EDGES.find(
              e => (e.from === agent.currentFrom && e.to === agent.currentTo) || (e.from === agent.currentTo && e.to === agent.currentFrom)
            );

            if (edge && (closedCrossings[edge.id] || (activeShock === 'flash_flood' && edge.isCrossing))) {
              agent.status = 'stuck';
              currentSpeed *= 0.12;
              const staminaDrain = Math.max(0.02, 0.08 - trafficJamSubsidy * 0.012);
              agent.stamina = Math.max(0, agent.stamina - staminaDrain * simSpeed);
            } else if (proactiveDispatch && (agent.currentTo === 'midtown_c' || agent.currentTo === 'midtown_s')) {
              agent.status = 'dispatched';
              agent.stamina = Math.min(100, agent.stamina + 0.01 * simSpeed);
            } else if (agent.status === 'cruising') {
              const staminaDrain = Math.max(0.01, 0.04 - trafficJamSubsidy * 0.006);
              agent.stamina = Math.max(0, agent.stamina - staminaDrain * simSpeed);
            }

            // Driver Reservation Wage & Fatigue Churn Check
            const hourlyEarnings = agent.cumulativeEarnings / Math.max(0.5, agent.shiftHours);
            if (agent.stamina <= 5 || hourlyEarnings < (agent.reservationWagePerHour - trafficJamSubsidy)) {
              if (Math.random() < 0.01) agent.status = 'offline';
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

                if ((selectedScenario === 'penn_rain' || activeShock === 'msg_concert') && Math.random() < 0.40) {
                  nextTarget = 'midtown_s';
                } else if (selectedScenario === 'lic_starvation' && Math.random() < 0.35) {
                  nextTarget = 'lic_hunters';
                } else if (selectedScenario === 'jfk_surge' && Math.random() < 0.45) {
                  nextTarget = 'jfk_airport';
                } else if (selectedScenario === 'yankee_egress' && Math.random() < 0.40) {
                  nextTarget = 'yankee_stadium';
                }

                while (nextTarget === startFrom) {
                  nextTarget = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
                }

                const newPath = dijkstraShortestPath(startFrom, nextTarget, graphAdjacency);
                agent.pathWaypoints = newPath;
                agent.waypointIndex = 0;
                agent.currentFrom = newPath[0] || startFrom;
                agent.currentTo = newPath[1] || nextTarget;

                // Batched Bipartite Matching: Acceptance Probability Model
                const pickupProb = surgeMultiplier > 2.2 ? 0.32 : (surgeMultiplier >= 1.6 ? 0.84 : 0.72);
                agent.status = Math.random() < pickupProb ? 'in_trip' : 'cruising';
                if (agent.status === 'in_trip') {
                  agent.stamina = Math.min(100, agent.stamina + 2.5);
                  agent.cumulativeEarnings += agent.fare * 0.80 + driverIncentiveBonus;
                }
              }
            }
          }

          const fromNode = NYC_55_TLC_ZONES[agent.currentFrom];
          const toNode = NYC_55_TLC_ZONES[agent.currentTo];
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
          ctx.arc(curX, curY, (agent.status === 'in_trip' ? 3.8 : 2.8) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.9 * dpr;
          ctx.stroke();

          if (agent.stamina < 30) {
            ctx.beginPath();
            ctx.arc(curX, curY, 5.5 * dpr, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.lineWidth = 1.0 * dpr;
            ctx.stroke();
          }
        });
      }

      // ── DYNAMIC WEATHER RAIN PARTICLES ANIMATION ───────────────────────────
      if (weatherSeverity === 'heavy_storm' || weatherSeverity === 'moderate') {
        ctx.strokeStyle = weatherSeverity === 'heavy_storm' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.18)';
        ctx.lineWidth = 1.2 * dpr;
        rainParticlesRef.current.forEach(p => {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 3 * dpr, p.y + p.length * dpr);
          ctx.stroke();

          if (isPlaying) {
            p.y += p.speed * simSpeed;
            p.x -= 2 * simSpeed;
            if (p.y > h * 1.5) p.y = -50;
            if (p.x < -50) p.x = w * 1.5;
          }
        });
      }

      ctx.restore();

      // Clock advance and loss ticker
      if (isPlaying) {
        setSimTick(t => t + 1);
        setTimeOfDay(prev => (prev + (0.003 * simSpeed)) % 24);
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
  }, [isPlaying, simSpeed, selectedScenario, activeShock, proactiveDispatch, virtualBatchingHubs, surgeMultiplier, weatherSeverity, trafficJamSubsidy, closedCrossings, graphAdjacency, inspectedZoneId, selectedBoroughFilter, camera, viewMode, diurnalMultiplier, driverIncentiveBonus]);

  // ── Mouse Drag & Pan Handlers (Google Maps Navigation) ─────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    cameraStartRef.current = { x: camera.x, y: camera.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setCamera({
      ...camera,
      x: cameraStartRef.current.x + dx / camera.scale,
      y: cameraStartRef.current.y + dy / camera.scale,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1 - e.deltaY * 0.0012;
    setCamera(c => ({
      ...c,
      scale: Math.max(0.5, Math.min(3.5, c.scale * zoomFactor)),
    }));
  };

  // Click on Canvas to inspect Zone OR Click-to-Block Arteries
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;

    // Transform screen click coordinates into camera-transformed canvas coords
    const rawX = (e.clientX - rect.left) * dpr;
    const rawY = (e.clientY - rect.top) * dpr;

    const clickX = (rawX - (w / 2 + camera.x * dpr)) / camera.scale + w / 2;
    const clickY = (rawY - (h / 2 + camera.y * dpr)) / camera.scale + h / 2;

    // 1. Check if clicked near any Zone Node
    let closestZoneId: string | null = null;
    let minDist = 30 * dpr;

    Object.values(NYC_55_TLC_ZONES).forEach(node => {
      const pos = getCanvasCoords(node.nx, node.ny, w, h);
      const dist = Math.hypot(pos.x - clickX, pos.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestZoneId = node.id;
      }
    });

    if (closestZoneId) {
      setInspectedZoneId(closestZoneId);
      return;
    }

    // 2. Check if clicked near any Edge (Click-to-Block Incident Injector)
    let closestEdgeId: string | null = null;
    let minEdgeDist = 18 * dpr;

    NYC_50_EDGES.forEach(edge => {
      const fromNode = NYC_55_TLC_ZONES[edge.from];
      const toNode = NYC_55_TLC_ZONES[edge.to];
      if (!fromNode || !toNode) return;

      const fromPos = getCanvasCoords(fromNode.nx, fromNode.ny, w, h);
      const toPos = getCanvasCoords(toNode.nx, toNode.ny, w, h);
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;

      const dist = Math.hypot(midX - clickX, midY - clickY);
      if (dist < minEdgeDist) {
        minEdgeDist = dist;
        closestEdgeId = edge.id;
      }
    });

    if (closestEdgeId) {
      const targetEdge = closestEdgeId;
      setClosedCrossings(prev => ({
        ...prev,
        [targetEdge]: !prev[targetEdge],
      }));
    }
  };

  // ── Calculated Real-Time Metrics ──────────────────────────────────────────
  const liveMetrics = useMemo(() => {
    const baselineTrips = Math.round(21400 * diurnalMultiplier);
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

    let avgWaitTimeMin = proactiveDispatch ? 6.4 : 24.5;
    if (closedCrossings.queensboro_bridge || closedCrossings.midtown_tunnel || activeShock === 'lincoln_accident') {
      avgWaitTimeMin += 7.8;
    }
    if (virtualBatchingHubs) {
      avgWaitTimeMin = Math.max(4.5, avgWaitTimeMin * 0.55);
    }

    const totalAgents = agentsRef.current.length || 240;
    const onlineAgents = agentsRef.current.filter(a => a.status !== 'offline').length || 220;
    const fleetOnlinePct = Math.round((onlineAgents / totalAgents) * 100);
    const avgStamina = Math.round(agentsRef.current.reduce((s, a) => s + a.stamina, 0) / totalAgents) || 74;

    const routeBaselineDuration = selectedRouteKey === 'midtown_lic' ? 32 : (selectedRouteKey === 'fidi_jfk' ? 48 : 24);
    const routeBaselineFare = selectedRouteKey === 'midtown_lic' ? 28.5 : (selectedRouteKey === 'fidi_jfk' ? 62.0 : 21.0);
    const expectedYieldPerMin = (routeBaselineFare + hazardSurcharge) / (routeBaselineDuration + (weatherSeverity === 'heavy_storm' ? 12 : 4));
    const routeAcceptanceRate = Math.min(95, Math.max(25, Math.round((1 / (1 + Math.exp(-6 * (expectedYieldPerMin - 0.55)))) * 100)));

    const deadheadReductionPct = proactiveDispatch ? 36.5 : 0;
    const fulfillmentRatePct = Math.min(97.2, (completedTrips / baselineTrips) * 100);

    const activeZone = inspectedZoneId ? NYC_55_TLC_ZONES[inspectedZoneId] : null;
    const zonePoissonDemand = activeZone ? Math.round(activeZone.baseLambda * diurnalMultiplier * (weatherSeverity === 'heavy_storm' ? 2.1 : (weatherSeverity === 'moderate' ? 1.4 : 1.0)) * (activeShock === 'msg_concert' && inspectedZoneId === 'midtown_s' ? 3.0 : 1.0)) : 0;
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
  }, [surgeMultiplier, weatherSeverity, proactiveDispatch, virtualBatchingHubs, additionalFleetCount, closedCrossings, activeShock, selectedRouteKey, hazardSurcharge, inspectedZoneId, diurnalMultiplier]);

  return (
    <div className={styles.fullscreenContainer} ref={containerRef}>
      {/* ── 100% FULLSCREEN INTERACTIVE CANVAS MAP (ZOOM & PAN ENABLED) ── */}
      <canvas
        ref={canvasRef}
        className={styles.fullscreenCanvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        title="Drag to pan • Scroll to zoom • Click zone for TLC telemetry • Click road to block/unblock"
      />

      {/* ── TOP FLOATING BAR (GOOGLE MAPS STYLE) ── */}
      <div className={styles.floatingTopBar}>
        {/* Left Nav Pill */}
        <div className={styles.floatingPill}>
          <Link href="/" className={styles.backBtn}>
            <FaArrowLeft /> Analytics
          </Link>
          <div className={styles.appBrand}>
            <FaCity color="var(--color-blue)" /> The City Machine Arena (55 TLC Zones)
          </div>
        </div>

        {/* 24-Hour Diurnal Clock Scrubber Pill */}
        <div className={styles.floatingClockPill}>
          <FaClock color="var(--color-blue)" />
          <span className={styles.clockBadge}>{formattedTimeStr}</span>
          <input
            type="range"
            min={0}
            max={24}
            step={0.25}
            value={timeOfDay}
            onChange={e => setTimeOfDay(Number(e.target.value))}
            className={styles.timeSlider}
            title="Scrub time of day (00:00 to 24:00)"
          />
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
        </div>
      </div>

      {/* ── TOP-RIGHT FLOATING TOOLBARS (TRANSLUCENT PILLS) ── */}
      <div className={styles.floatingRightToolbar}>
        {/* View Mode Switcher (Particles vs Heatmap) */}
        <div className={styles.viewModeGroup}>
          <button
            className={`${styles.viewModeBtn} ${viewMode === 'particles' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('particles')}
          >
            <FaCar /> Vehicle Particles
          </button>
          <button
            className={`${styles.viewModeBtn} ${viewMode === 'heatmap' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('heatmap')}
          >
            <FaFire color="var(--color-amber)" /> Demand Heatmap
          </button>
        </div>

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
                    <div className={styles.kpiSub}>{proactiveDispatch ? '-74% reduction' : 'Elevated storm queuing'}</div>
                  </div>

                  <div className={styles.kpiCard}>
                    <div className={styles.kpiLabel}>Dispatch ROI</div>
                    <div className={styles.kpiValue} style={{ color: 'var(--color-green)' }}>
                      {liveMetrics.operationalRoi.toFixed(1)}x
                    </div>
                    <div className={styles.kpiSub}>+{formatCurrency(liveMetrics.grossRevenueUplift)} GMV uplift</div>
                  </div>
                </div>

                {/* Policy A/B Comparison Table */}
                <div style={{ marginTop: 4 }}>
                  <label className={styles.label}>Policy A/B Benchmark</label>
                  <table className={styles.abComparisonTable}>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Legacy Model</th>
                        <th>AI Staging</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Avg Wait Time</td>
                        <td className={styles.abLegacyVal}>24.5 min</td>
                        <td className={styles.abAiVal}>{liveMetrics.avgWaitTimeMin.toFixed(1)} min</td>
                      </tr>
                      <tr>
                        <td>Fulfillment</td>
                        <td className={styles.abLegacyVal}>64.2%</td>
                        <td className={styles.abAiVal}>{liveMetrics.fulfillmentRatePct.toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td>Lost GMV</td>
                        <td className={styles.abLegacyVal}>-$14,200</td>
                        <td className={styles.abAiVal}>-$3,120</td>
                      </tr>
                    </tbody>
                  </table>
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
              <span className={styles.zoneBoroughBadge}>TLC #{liveMetrics.activeZone.tlcLocationId} • {liveMetrics.activeZone.borough}</span>
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

      {/* ── FLOATING ZOOM & PAN CONTROLS (BOTTOM RIGHT) ── */}
      <div className={styles.floatingZoomGroup}>
        <button
          className={styles.zoomBtn}
          onClick={() => setCamera(c => ({ ...c, scale: Math.min(3.5, c.scale * 1.25) }))}
          title="Zoom In (+)"
        >
          <FaPlus size={12} />
        </button>
        <button
          className={styles.zoomBtn}
          onClick={() => setCamera(c => ({ ...c, scale: Math.max(0.5, c.scale / 1.25) }))}
          title="Zoom Out (-)"
        >
          <FaMinus size={12} />
        </button>
        <button
          className={styles.zoomBtn}
          onClick={() => setCamera({ x: 0, y: 0, scale: 1.0 })}
          title="Reset Camera View"
        >
          <FaCrosshairs size={12} />
        </button>
      </div>

      {/* ── FLOATING BOTTOM LEGEND (BOTTOM LEFT) ── */}
      <div className={styles.floatingLegend}>
        <div><span className={styles.legendDot} style={{ background: '#10b981' }} /> In-Trip</div>
        <div><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Cruising</div>
        <div><span className={styles.legendDot} style={{ background: '#ef4444' }} /> Delayed / Blocked</div>
        <div><span className={styles.legendDot} style={{ background: '#2563eb' }} /> Forward Staged</div>
        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 8, color: 'var(--color-blue)', fontWeight: 600 }}>
          💡 Click any road to close/open
        </div>
      </div>
    </div>
  );
}






