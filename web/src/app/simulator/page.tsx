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
  FaCompass,
  FaFlagUsa,
  FaTrain,
  FaChartLine,
  FaMicrochip,
  FaGlobeAmericas,
  FaLayerGroup,
  FaInfoCircle,
} from 'react-icons/fa';
import styles from './simulator.module.css';

// ── 1. EXPANDED MULTI-SCALE GEOSPATIAL REGISTRY (NATIONAL, REGIONAL & TLC) ───
export interface GpsZoneDef {
  id: string;
  tlcLocationId?: number;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  borough?: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island' | 'Regional' | 'National';
  tier: 'national' | 'regional' | 'urban';
  baseLambda: number;
  avgFare: number;
}

// 24 Major US Metropolitan Hubs (Real WGS-84 Coordinates)
export const US_NATIONAL_HUBS: Record<string, GpsZoneDef> = {
  // East Coast & Northeast
  bos: { id: 'bos', name: 'Boston Metropolitan Hub (Logan / I-90)', shortName: 'Boston (BOS)', lat: 42.3601, lon: -71.0589, tier: 'national', borough: 'National', baseLambda: 420, avgFare: 145.0 },
  phl: { id: 'phl', name: 'Philadelphia Hub (30th St / I-95)', shortName: 'Philadelphia (PHL)', lat: 39.9526, lon: -75.1652, tier: 'national', borough: 'National', baseLambda: 380, avgFare: 110.0 },
  bwi: { id: 'bwi', name: 'Baltimore Inner Harbor / BWI Airport', shortName: 'Baltimore (BWI)', lat: 39.2904, lon: -76.6122, tier: 'national', borough: 'National', baseLambda: 320, avgFare: 125.0 },
  was: { id: 'was', name: 'Washington D.C. Capital Hub (Union Sta / I-95)', shortName: 'Washington D.C.', lat: 38.9072, lon: -77.0369, tier: 'national', borough: 'National', baseLambda: 490, avgFare: 160.0 },
  clt: { id: 'clt', name: 'Charlotte Financial & Flight Hub (CLT / I-85)', shortName: 'Charlotte (CLT)', lat: 35.2271, lon: -80.8431, tier: 'national', borough: 'National', baseLambda: 360, avgFare: 195.0 },
  atl: { id: 'atl', name: 'Atlanta Transit Megahub (ATL / I-85)', shortName: 'Atlanta (ATL)', lat: 33.7490, lon: -84.3880, tier: 'national', borough: 'National', baseLambda: 610, avgFare: 240.0 },
  mco: { id: 'mco', name: 'Orlando Tourism & Transit Hub (MCO / I-4)', shortName: 'Orlando (MCO)', lat: 28.5383, lon: -81.3792, tier: 'national', borough: 'National', baseLambda: 440, avgFare: 260.0 },
  mia: { id: 'mia', name: 'Miami Gateway Hub (MIA / I-95 South)', shortName: 'Miami (MIA)', lat: 25.7617, lon: -80.1918, tier: 'national', borough: 'National', baseLambda: 520, avgFare: 290.0 },

  // Midwest & Rust Belt
  pit: { id: 'pit', name: 'Pittsburgh Three Rivers Hub (PIT / I-76)', shortName: 'Pittsburgh (PIT)', lat: 40.4406, lon: -79.9959, tier: 'national', borough: 'National', baseLambda: 280, avgFare: 175.0 },
  cle: { id: 'cle', name: 'Cleveland Lakefront Corridor (CLE / I-90)', shortName: 'Cleveland (CLE)', lat: 41.4993, lon: -81.6944, tier: 'national', borough: 'National', baseLambda: 260, avgFare: 185.0 },
  det: { id: 'det', name: 'Detroit Auto & Freight Hub (DTW / I-94)', shortName: 'Detroit (DTW)', lat: 42.3314, lon: -83.0458, tier: 'national', borough: 'National', baseLambda: 310, avgFare: 280.0 },
  chi: { id: 'chi', name: 'Chicago Continental Hub (O\'Hare / I-80/I-90)', shortName: 'Chicago (ORD)', lat: 41.8781, lon: -87.6298, tier: 'national', borough: 'National', baseLambda: 680, avgFare: 320.0 },
  msp: { id: 'msp', name: 'Minneapolis - Saint Paul Twin Cities (MSP / I-94)', shortName: 'Minneapolis (MSP)', lat: 44.9778, lon: -93.2650, tier: 'national', borough: 'National', baseLambda: 340, avgFare: 330.0 },
  stl: { id: 'stl', name: 'St. Louis Gateway Arch Corridor (STL / I-70)', shortName: 'St. Louis (STL)', lat: 38.6270, lon: -90.1994, tier: 'national', borough: 'National', baseLambda: 290, avgFare: 275.0 },

  // South & Central
  bna: { id: 'bna', name: 'Nashville Music City Hub (BNA / I-40)', shortName: 'Nashville (BNA)', lat: 36.1627, lon: -86.7816, tier: 'national', borough: 'National', baseLambda: 390, avgFare: 230.0 },
  msy: { id: 'msy', name: 'New Orleans River Corridor (MSY / I-10)', shortName: 'New Orleans (MSY)', lat: 29.9511, lon: -90.0715, tier: 'national', borough: 'National', baseLambda: 360, avgFare: 280.0 },
  dfw: { id: 'dfw', name: 'Dallas - Fort Worth Megahub (DFW / I-35)', shortName: 'Dallas (DFW)', lat: 32.7767, lon: -96.7970, tier: 'national', borough: 'National', baseLambda: 580, avgFare: 350.0 },
  hou: { id: 'hou', name: 'Houston Energy & Port Corridor (IAH / I-10)', shortName: 'Houston (IAH)', lat: 29.7604, lon: -95.3698, tier: 'national', borough: 'National', baseLambda: 540, avgFare: 370.0 },
  aus: { id: 'aus', name: 'Austin Innovation Hub (AUS / I-35)', shortName: 'Austin (AUS)', lat: 30.2672, lon: -97.7431, tier: 'national', borough: 'National', baseLambda: 430, avgFare: 340.0 },
  den: { id: 'den', name: 'Denver Rocky Mountain Hub (DEN / I-70/I-25)', shortName: 'Denver (DEN)', lat: 39.7392, lon: -104.9903, tier: 'national', borough: 'National', baseLambda: 460, avgFare: 420.0 },

  // West Coast & Desert
  phx: { id: 'phx', name: 'Phoenix Valley Hub (PHX / I-10)', shortName: 'Phoenix (PHX)', lat: 33.4484, lon: -112.0740, tier: 'national', borough: 'National', baseLambda: 390, avgFare: 460.0 },
  las: { id: 'las', name: 'Las Vegas Entertainment Strip (LAS / I-15)', shortName: 'Las Vegas (LAS)', lat: 36.1699, lon: -115.1398, tier: 'national', borough: 'National', baseLambda: 510, avgFare: 480.0 },
  lax: { id: 'lax', name: 'Los Angeles Pacific Megahub (LAX / I-5/I-10)', shortName: 'Los Angeles (LAX)', lat: 34.0522, lon: -118.2437, tier: 'national', borough: 'National', baseLambda: 890, avgFare: 580.0 },
  sfo: { id: 'sfo', name: 'San Francisco Bay Area Hub (SFO / I-80 West)', shortName: 'San Francisco (SFO)', lat: 37.7749, lon: -122.4194, tier: 'national', borough: 'National', baseLambda: 740, avgFare: 590.0 },
  pdx: { id: 'pdx', name: 'Portland Columbia River Hub (PDX / I-5)', shortName: 'Portland (PDX)', lat: 45.5152, lon: -122.6784, tier: 'national', borough: 'National', baseLambda: 370, avgFare: 520.0 },
  sea: { id: 'sea', name: 'Seattle Pacific Northwest Hub (SEA / I-5 North)', shortName: 'Seattle (SEA)', lat: 47.6062, lon: -122.3321, tier: 'national', borough: 'National', baseLambda: 480, avgFare: 540.0 },
};

// 12 Regional Tri-State Outer Hubs
export const REGIONAL_TRISTATE_HUBS: Record<string, GpsZoneDef> = {
  jersey_city: { id: 'jersey_city', name: 'Jersey City / Exchange Place Financial', shortName: 'Jersey City', lat: 40.7178, lon: -74.0431, tier: 'regional', borough: 'Regional', baseLambda: 180, avgFare: 38.0 },
  hoboken: { id: 'hoboken', name: 'Hoboken Terminal (PATH / NJ Transit)', shortName: 'Hoboken', lat: 40.7357, lon: -74.0298, tier: 'regional', borough: 'Regional', baseLambda: 160, avgFare: 34.0 },
  fort_lee: { id: 'fort_lee', name: 'Fort Lee / George Washington Bridge Portal', shortName: 'Fort Lee (GW Bridge)', lat: 40.8509, lon: -73.9701, tier: 'regional', borough: 'Regional', baseLambda: 140, avgFare: 42.0 },
  newark_hub: { id: 'newark_hub', name: 'Newark Penn Station / Downtown', shortName: 'Newark Hub', lat: 40.7357, lon: -74.1724, tier: 'regional', borough: 'Regional', baseLambda: 190, avgFare: 52.0 },
  trenton_hub: { id: 'trenton_hub', name: 'Trenton Capital Corridor (Amtrak / NJT)', shortName: 'Trenton NJ', lat: 40.2171, lon: -74.7429, tier: 'regional', borough: 'Regional', baseLambda: 85, avgFare: 95.0 },
  yonkers: { id: 'yonkers', name: 'Yonkers Downtown / Hudson Waterfront', shortName: 'Yonkers', lat: 40.9312, lon: -73.8987, tier: 'regional', borough: 'Regional', baseLambda: 105, avgFare: 48.0 },
  white_plains: { id: 'white_plains', name: 'Westchester / White Plains Metro-North', shortName: 'White Plains', lat: 41.0340, lon: -73.7629, tier: 'regional', borough: 'Regional', baseLambda: 110, avgFare: 65.0 },
  new_rochelle: { id: 'new_rochelle', name: 'New Rochelle Sound Shore Gateway', shortName: 'New Rochelle', lat: 40.9115, lon: -73.7826, tier: 'regional', borough: 'Regional', baseLambda: 90, avgFare: 55.0 },
  greenwich: { id: 'greenwich', name: 'Greenwich CT Gold Coast Corridor', shortName: 'Greenwich CT', lat: 41.0262, lon: -73.6282, tier: 'regional', borough: 'Regional', baseLambda: 95, avgFare: 80.0 },
  stamford: { id: 'stamford', name: 'Stamford Gateway (I-95 CT Corridor)', shortName: 'Stamford CT', lat: 41.0534, lon: -73.5387, tier: 'regional', borough: 'Regional', baseLambda: 115, avgFare: 85.0 },
  new_haven: { id: 'new_haven', name: 'New Haven Union Station / Yale Hub', shortName: 'New Haven CT', lat: 41.3083, lon: -72.9279, tier: 'regional', borough: 'Regional', baseLambda: 80, avgFare: 120.0 },
  hempstead: { id: 'hempstead', name: 'Long Island / Hempstead Hub', shortName: 'Long Island (HEM)', lat: 40.7062, lon: -73.6187, tier: 'regional', borough: 'Regional', baseLambda: 130, avgFare: 55.0 },
};

// 65+ Authentic NYC TLC Zones & Landmarks
export const NYC_REAL_GPS_ZONES: Record<string, GpsZoneDef> = {
  // ── MANHATTAN (22 Zones & Landmarks) ──
  inwood: { id: 'inwood', tlcLocationId: 127, name: 'Inwood / Fort Tryon Park', shortName: 'Inwood #127', lat: 40.8677, lon: -73.9212, borough: 'Manhattan', tier: 'urban', baseLambda: 35, avgFare: 22.0 },
  wash_hts: { id: 'wash_hts', tlcLocationId: 244, name: 'Washington Heights North/South', shortName: 'Wash Hts #244', lat: 40.8415, lon: -73.9395, borough: 'Manhattan', tier: 'urban', baseLambda: 55, avgFare: 21.5 },
  harlem_n: { id: 'harlem_n', tlcLocationId: 116, name: 'Central Harlem North (125th St)', shortName: 'Harlem N #116', lat: 40.8175, lon: -73.9430, borough: 'Manhattan', tier: 'urban', baseLambda: 85, avgFare: 18.5 },
  morningside: { id: 'morningside', tlcLocationId: 166, name: 'Morningside Heights / Columbia', shortName: 'Columbia #166', lat: 40.8090, lon: -73.9630, borough: 'Manhattan', tier: 'urban', baseLambda: 60, avgFare: 17.5 },
  east_harlem: { id: 'east_harlem', tlcLocationId: 74, name: 'East Harlem / El Barrio', shortName: 'E. Harlem #74', lat: 40.7955, lon: -73.9380, borough: 'Manhattan', tier: 'urban', baseLambda: 70, avgFare: 17.0 },
  ues_north: { id: 'ues_north', tlcLocationId: 236, name: 'Upper East Side North / Yorkville', shortName: 'UES North #236', lat: 40.7760, lon: -73.9525, borough: 'Manhattan', tier: 'urban', baseLambda: 165, avgFare: 16.5 },
  met_museum: { id: 'met_museum', tlcLocationId: 236, name: 'Metropolitan Museum of Art / Museum Mile', shortName: 'Met Museum', lat: 40.7794, lon: -73.9632, borough: 'Manhattan', tier: 'urban', baseLambda: 180, avgFare: 18.5 },
  ues_south: { id: 'ues_south', tlcLocationId: 237, name: 'Upper East Side South / Lenox Hill', shortName: 'UES South #237', lat: 40.7645, lon: -73.9625, borough: 'Manhattan', tier: 'urban', baseLambda: 195, avgFare: 16.8 },
  uws_north: { id: 'uws_north', tlcLocationId: 238, name: 'Upper West Side North (86th St)', shortName: 'UWS North #238', lat: 40.7900, lon: -73.9720, borough: 'Manhattan', tier: 'urban', baseLambda: 130, avgFare: 17.2 },
  uws_south: { id: 'uws_south', tlcLocationId: 239, name: 'Upper West Side South / Lincoln Ctr', shortName: 'UWS South #239', lat: 40.7730, lon: -73.9810, borough: 'Manhattan', tier: 'urban', baseLambda: 160, avgFare: 17.4 },
  cp_zoo: { id: 'cp_zoo', tlcLocationId: 43, name: 'Central Park South / Zoo / Wollman Rink', shortName: 'Central Park Zoo', lat: 40.7678, lon: -73.9718, borough: 'Manhattan', tier: 'urban', baseLambda: 175, avgFare: 19.0 },
  midtown_w: { id: 'midtown_w', tlcLocationId: 230, name: 'Times Square / Theatre District', shortName: 'Times Sq #230', lat: 40.7580, lon: -73.9855, borough: 'Manhattan', tier: 'urban', baseLambda: 380, avgFare: 29.0 },
  midtown_c: { id: 'midtown_c', tlcLocationId: 161, name: 'Midtown Center / Grand Central', shortName: 'Midtown C #161', lat: 40.7527, lon: -73.9772, borough: 'Manhattan', tier: 'urban', baseLambda: 420, avgFare: 24.5 },
  midtown_s: { id: 'midtown_s', tlcLocationId: 162, name: 'Penn Station / Madison Sq West', shortName: 'Penn Sta #162', lat: 40.7505, lon: -73.9934, borough: 'Manhattan', tier: 'urban', baseLambda: 390, avgFare: 19.8 },
  hudson_yards: { id: 'hudson_yards', tlcLocationId: 246, name: 'Hudson Yards / The Vessel / High Line', shortName: 'Hudson Yards', lat: 40.7538, lon: -74.0022, borough: 'Manhattan', tier: 'urban', baseLambda: 260, avgFare: 25.5 },
  murray_hill: { id: 'murray_hill', tlcLocationId: 170, name: 'Murray Hill / Kips Bay', shortName: 'Murray Hill #170', lat: 40.7480, lon: -73.9760, borough: 'Manhattan', tier: 'urban', baseLambda: 175, avgFare: 18.2 },
  chelsea: { id: 'chelsea', tlcLocationId: 48, name: 'Chelsea / High Line / Meatpacking', shortName: 'Chelsea #48', lat: 40.7465, lon: -74.0015, borough: 'Manhattan', tier: 'urban', baseLambda: 240, avgFare: 21.0 },
  gramercy: { id: 'gramercy', tlcLocationId: 107, name: 'Gramercy / Flatiron / Union Sq', shortName: 'Gramercy #107', lat: 40.7380, lon: -73.9860, borough: 'Manhattan', tier: 'urban', baseLambda: 260, avgFare: 20.5 },
  east_village: { id: 'east_village', tlcLocationId: 79, name: 'East Village / Alphabet City', shortName: 'E. Village #79', lat: 40.7280, lon: -73.9820, borough: 'Manhattan', tier: 'urban', baseLambda: 230, avgFare: 18.5 },
  west_village: { id: 'west_village', tlcLocationId: 246, name: 'Greenwich Village / West Village', shortName: 'W. Village #246', lat: 40.7340, lon: -74.0040, borough: 'Manhattan', tier: 'urban', baseLambda: 245, avgFare: 20.8 },
  soho_tribeca: { id: 'soho_tribeca', tlcLocationId: 249, name: 'SoHo / Tribeca / Hudson Sq', shortName: 'SoHo/Tribeca #249', lat: 40.7210, lon: -74.0050, borough: 'Manhattan', tier: 'urban', baseLambda: 270, avgFare: 25.0 },
  wtc_oculus: { id: 'wtc_oculus', tlcLocationId: 87, name: 'World Trade Center / Oculus / 9/11 Memorial', shortName: 'WTC Oculus', lat: 40.7115, lon: -74.0125, borough: 'Manhattan', tier: 'urban', baseLambda: 310, avgFare: 27.5 },
  lower_east: { id: 'lower_east', tlcLocationId: 148, name: 'Lower East Side / Chinatown', shortName: 'LES #148', lat: 40.7160, lon: -73.9880, borough: 'Manhattan', tier: 'urban', baseLambda: 185, avgFare: 19.5 },
  fidi: { id: 'fidi', tlcLocationId: 87, name: 'Financial District / Wall St / Battery', shortName: 'FiDi #87', lat: 40.7075, lon: -74.0090, borough: 'Manhattan', tier: 'urban', baseLambda: 290, avgFare: 26.0 },

  // ── BROOKLYN (15 Zones & Landmarks) ──
  greenpoint: { id: 'greenpoint', tlcLocationId: 112, name: 'Greenpoint', shortName: 'Greenpoint #112', lat: 40.7280, lon: -73.9520, borough: 'Brooklyn', tier: 'urban', baseLambda: 110, avgFare: 21.0 },
  williamsburg_n: { id: 'williamsburg_n', tlcLocationId: 255, name: 'Williamsburg North (Bedford Ave)', shortName: 'W-Burg N #255', lat: 40.7180, lon: -73.9580, borough: 'Brooklyn', tier: 'urban', baseLambda: 190, avgFare: 21.8 },
  williamsburg_s: { id: 'williamsburg_s', tlcLocationId: 256, name: 'Williamsburg South (Broadway)', shortName: 'W-Burg S #256', lat: 40.7080, lon: -73.9570, borough: 'Brooklyn', tier: 'urban', baseLambda: 155, avgFare: 20.4 },
  bk_navy_yard: { id: 'bk_navy_yard', tlcLocationId: 89, name: 'Brooklyn Navy Yard Innovation Center', shortName: 'BK Navy Yard', lat: 40.7020, lon: -73.9717, borough: 'Brooklyn', tier: 'urban', baseLambda: 115, avgFare: 22.0 },
  dumbo: { id: 'dumbo', tlcLocationId: 89, name: 'DUMBO / Vinegar Hill', shortName: 'DUMBO #89', lat: 40.7033, lon: -73.9881, borough: 'Brooklyn', tier: 'urban', baseLambda: 125, avgFare: 23.5 },
  bk_heights: { id: 'bk_heights', tlcLocationId: 25, name: 'Brooklyn Heights / Cobble Hill', shortName: 'BK Heights #25', lat: 40.6960, lon: -73.9940, borough: 'Brooklyn', tier: 'urban', baseLambda: 135, avgFare: 22.0 },
  downtown_bk: { id: 'downtown_bk', tlcLocationId: 65, name: 'Downtown Brooklyn / MetroTech', shortName: 'Downtown BK #65', lat: 40.6930, lon: -73.9860, borough: 'Brooklyn', tier: 'urban', baseLambda: 210, avgFare: 21.5 },
  atlantic_hub: { id: 'atlantic_hub', tlcLocationId: 66, name: 'Atlantic Terminal / Barclays Ctr', shortName: 'Barclays Hub #66', lat: 40.6840, lon: -73.9760, borough: 'Brooklyn', tier: 'urban', baseLambda: 245, avgFare: 22.5 },
  bushwick_w: { id: 'bushwick_w', tlcLocationId: 36, name: 'Bushwick West / Morgan Ave', shortName: 'Bushwick W #36', lat: 40.7040, lon: -73.9330, borough: 'Brooklyn', tier: 'urban', baseLambda: 115, avgFare: 20.0 },
  bushwick_e: { id: 'bushwick_e', tlcLocationId: 37, name: 'Bushwick East / Myrtle Ave', shortName: 'Bushwick E #37', lat: 40.6920, lon: -73.9140, borough: 'Brooklyn', tier: 'urban', baseLambda: 90, avgFare: 19.5 },
  bed_stuy: { id: 'bed_stuy', tlcLocationId: 17, name: 'Bedford-Stuyvesant (Fulton St)', shortName: 'Bed-Stuy #17', lat: 40.6870, lon: -73.9440, borough: 'Brooklyn', tier: 'urban', baseLambda: 130, avgFare: 19.2 },
  crown_heights: { id: 'crown_heights', tlcLocationId: 61, name: 'Crown Heights North / Eastern Pkwy', shortName: 'Crown Hts #61', lat: 40.6700, lon: -73.9430, borough: 'Brooklyn', tier: 'urban', baseLambda: 120, avgFare: 19.0 },
  park_slope: { id: 'park_slope', tlcLocationId: 181, name: 'Park Slope / Prospect Park West', shortName: 'Park Slope #181', lat: 40.6710, lon: -73.9770, borough: 'Brooklyn', tier: 'urban', baseLambda: 145, avgFare: 22.8 },
  bay_ridge: { id: 'bay_ridge', tlcLocationId: 14, name: 'Bay Ridge / Fort Hamilton', shortName: 'Bay Ridge #14', lat: 40.6260, lon: -74.0310, borough: 'Brooklyn', tier: 'urban', baseLambda: 65, avgFare: 30.5 },
  coney_island: { id: 'coney_island', tlcLocationId: 55, name: 'Coney Island Boardwalk / Luna Park / Aquarium', shortName: 'Coney Island #55', lat: 40.5755, lon: -73.9707, borough: 'Brooklyn', tier: 'urban', baseLambda: 95, avgFare: 36.0 },

  // ── QUEENS (14 Zones & Landmarks) ──
  astoria_n: { id: 'astoria_n', tlcLocationId: 7, name: 'Astoria North / Ditmars Blvd', shortName: 'Astoria N #7', lat: 40.7770, lon: -73.9080, borough: 'Queens', tier: 'urban', baseLambda: 120, avgFare: 21.0 },
  astoria_s: { id: 'astoria_s', tlcLocationId: 8, name: 'Astoria South / Broadway', shortName: 'Astoria S #8', lat: 40.7610, lon: -73.9240, borough: 'Queens', tier: 'urban', baseLambda: 140, avgFare: 21.5 },
  lic_hunters: { id: 'lic_hunters', tlcLocationId: 146, name: 'Long Island City / Hunters Point', shortName: 'Queens LIC #146', lat: 40.7440, lon: -73.9530, borough: 'Queens', tier: 'urban', baseLambda: 190, avgFare: 22.8 },
  sunnyside: { id: 'sunnyside', tlcLocationId: 226, name: 'Sunnyside / Woodside', shortName: 'Sunnyside #226', lat: 40.7430, lon: -73.9230, borough: 'Queens', tier: 'urban', baseLambda: 110, avgFare: 21.0 },
  lga_airport: { id: 'lga_airport', tlcLocationId: 138, name: 'LaGuardia Airport (LGA Terminals)', shortName: 'LGA Airport #138', lat: 40.7769, lon: -73.8740, borough: 'Queens', tier: 'urban', baseLambda: 280, avgFare: 44.0 },
  corona: { id: 'corona', tlcLocationId: 56, name: 'Corona / Jackson Heights', shortName: 'Jackson Hts #56', lat: 40.7480, lon: -73.8620, borough: 'Queens', tier: 'urban', baseLambda: 125, avgFare: 22.0 },
  citi_field: { id: 'citi_field', tlcLocationId: 93, name: 'Citi Field / USTA Billie Jean Tennis Center', shortName: 'Citi Field', lat: 40.7571, lon: -73.8458, borough: 'Queens', tier: 'urban', baseLambda: 170, avgFare: 28.0 },
  flushing: { id: 'flushing', tlcLocationId: 93, name: 'Flushing Main St / Chinatown', shortName: 'Flushing #93', lat: 40.7580, lon: -73.8320, borough: 'Queens', tier: 'urban', baseLambda: 155, avgFare: 26.5 },
  middle_village: { id: 'middle_village', tlcLocationId: 157, name: 'Middle Village / Maspeth', shortName: 'Maspeth #157', lat: 40.7180, lon: -73.8860, borough: 'Queens', tier: 'urban', baseLambda: 75, avgFare: 22.0 },
  forest_hills: { id: 'forest_hills', tlcLocationId: 101, name: 'Forest Hills / Austin St', shortName: 'Forest Hills #101', lat: 40.7180, lon: -73.8440, borough: 'Queens', tier: 'urban', baseLambda: 115, avgFare: 23.5 },
  kew_gardens: { id: 'kew_gardens', tlcLocationId: 134, name: 'Kew Gardens / Queens Blvd', shortName: 'Kew Gardens #134', lat: 40.7080, lon: -73.8310, borough: 'Queens', tier: 'urban', baseLambda: 95, avgFare: 24.0 },
  jamaica_center: { id: 'jamaica_center', tlcLocationId: 130, name: 'Jamaica Center / AirTrain LIRR Hub', shortName: 'Jamaica Hub #130', lat: 40.7020, lon: -73.7980, borough: 'Queens', tier: 'urban', baseLambda: 170, avgFare: 28.5 },
  jfk_airport: { id: 'jfk_airport', tlcLocationId: 132, name: 'JFK International Airport (Terminals 1-8)', shortName: 'JFK Airport #132', lat: 40.6413, lon: -73.7781, borough: 'Queens', tier: 'urban', baseLambda: 380, avgFare: 74.0 },
  rockaway: { id: 'rockaway', tlcLocationId: 201, name: 'Rockaway Beach / Boardwalk Transit', shortName: 'Rockaway #201', lat: 40.5865, lon: -73.8160, borough: 'Queens', tier: 'urban', baseLambda: 60, avgFare: 42.0 },

  // ── BRONX (6 Zones) ──
  riverdale: { id: 'riverdale', tlcLocationId: 200, name: 'Riverdale / Spuyten Duyvil', shortName: 'Riverdale #200', lat: 40.8980, lon: -73.9050, borough: 'Bronx', tier: 'urban', baseLambda: 30, avgFare: 24.5 },
  kingsbridge: { id: 'kingsbridge', tlcLocationId: 137, name: 'Kingsbridge / Marble Hill', shortName: 'Kingsbridge #137', lat: 40.8750, lon: -73.9020, borough: 'Bronx', tier: 'urban', baseLambda: 45, avgFare: 21.0 },
  yankee_stadium: { id: 'yankee_stadium', tlcLocationId: 233, name: 'Yankee Stadium / Grand Concourse', shortName: 'Yankee Hub #233', lat: 40.8296, lon: -73.9262, borough: 'Bronx', tier: 'urban', baseLambda: 95, avgFare: 22.0 },
  mott_haven: { id: 'mott_haven', tlcLocationId: 168, name: 'Mott Haven / Port Morris Hub', shortName: 'Mott Haven #168', lat: 40.8090, lon: -73.9210, borough: 'Bronx', tier: 'urban', baseLambda: 60, avgFare: 19.5 },
  hunts_point: { id: 'hunts_point', tlcLocationId: 119, name: 'Hunts Point Wholesale Market', shortName: 'Hunts Point #119', lat: 40.8120, lon: -73.8820, borough: 'Bronx', tier: 'urban', baseLambda: 50, avgFare: 20.0 },
  fordham: { id: 'fordham', tlcLocationId: 94, name: 'Fordham / Belmont Arthur Ave', shortName: 'Fordham #94', lat: 40.8610, lon: -73.8890, borough: 'Bronx', tier: 'urban', baseLambda: 70, avgFare: 21.0 },

  // ── STATEN ISLAND & GATEWAY (4 Zones) ──
  st_george: { id: 'st_george', tlcLocationId: 214, name: 'St. George Ferry Terminal (SI)', shortName: 'St. George #214', lat: 40.6430, lon: -74.0760, borough: 'Staten Island', tier: 'urban', baseLambda: 50, avgFare: 36.0 },
  west_brighton: { id: 'west_brighton', tlcLocationId: 251, name: 'West New Brighton / Castleton Ave', shortName: 'W. Brighton #251', lat: 40.6350, lon: -74.1140, borough: 'Staten Island', tier: 'urban', baseLambda: 35, avgFare: 34.0 },
  tottenville: { id: 'tottenville', tlcLocationId: 241, name: 'Tottenville / Arthur Kill Gateway', shortName: 'Tottenville #241', lat: 40.5100, lon: -74.2480, borough: 'Staten Island', tier: 'urban', baseLambda: 25, avgFare: 48.0 },
  ewr_gateway: { id: 'ewr_gateway', tlcLocationId: 1, name: 'Newark Airport / NJ Gateway (I-78)', shortName: 'NJ/EWR Gateway #1', lat: 40.6895, lon: -74.1745, borough: 'Manhattan', tier: 'urban', baseLambda: 85, avgFare: 58.0 },
};

// Combined Registry
export const ALL_GEO_ZONES: Record<string, GpsZoneDef> = {
  ...NYC_REAL_GPS_ZONES,
  ...REGIONAL_TRISTATE_HUBS,
  ...US_NATIONAL_HUBS,
};

// ── 2. US CONTINENTAL INTERSTATE HIGHWAYS & CORRIDORS ─────────────────────────
export const US_INTERSTATE_HIGHWAYS = [
  // I-95 North-South Atlantic Corridor (Boston -> NYC -> Philly -> Baltimore -> DC -> Charlotte -> Atlanta -> Miami)
  { id: 'i95_corridor', name: 'Interstate 95 (Atlantic Seaboard)', waypoints: [{ lat: 42.3601, lon: -71.0589 }, { lat: 41.0534, lon: -73.5387 }, { lat: 40.7580, lon: -73.9855 }, { lat: 39.9526, lon: -75.1652 }, { lat: 39.2904, lon: -76.6122 }, { lat: 38.9072, lon: -77.0369 }, { lat: 35.2271, lon: -80.8431 }, { lat: 33.7490, lon: -84.3880 }, { lat: 28.5383, lon: -81.3792 }, { lat: 25.7617, lon: -80.1918 }] },
  // I-80 Transcontinental Corridor (NYC -> Pittsburgh -> Cleveland -> Chicago -> Denver -> Salt Lake -> SFO)
  { id: 'i80_corridor', name: 'Interstate 80 (Transcontinental)', waypoints: [{ lat: 40.7580, lon: -73.9855 }, { lat: 40.4406, lon: -79.9959 }, { lat: 41.4993, lon: -81.6944 }, { lat: 41.8781, lon: -87.6298 }, { lat: 39.7392, lon: -104.9903 }, { lat: 37.7749, lon: -122.4194 }] },
  // I-90 Northern Corridor (Boston -> Detroit -> Chicago -> Minneapolis -> Seattle)
  { id: 'i90_corridor', name: 'Interstate 90 (Northern Coast-to-Coast)', waypoints: [{ lat: 42.3601, lon: -71.0589 }, { lat: 42.3314, lon: -83.0458 }, { lat: 41.8781, lon: -87.6298 }, { lat: 44.9778, lon: -93.2650 }, { lat: 47.6062, lon: -122.3321 }] },
  // I-10 Southern Transcontinental (Miami -> Orlando -> New Orleans -> Houston -> Dallas -> Phoenix -> LAX)
  { id: 'i10_corridor', name: 'Interstate 10 (Sunbelt Express)', waypoints: [{ lat: 25.7617, lon: -80.1918 }, { lat: 29.9511, lon: -90.0715 }, { lat: 29.7604, lon: -95.3698 }, { lat: 32.7767, lon: -96.7970 }, { lat: 33.4484, lon: -112.0740 }, { lat: 34.0522, lon: -118.2437 }] },
  // I-5 West Coast Spine (Seattle -> Portland -> SFO -> LAX)
  { id: 'i5_corridor', name: 'Interstate 5 (Pacific Corridor)', waypoints: [{ lat: 47.6062, lon: -122.3321 }, { lat: 45.5152, lon: -122.6784 }, { lat: 37.7749, lon: -122.4194 }, { lat: 34.0522, lon: -118.2437 }] },
  // I-70 Central Spine (DC/Baltimore -> Pittsburgh -> St. Louis -> Denver -> Las Vegas)
  { id: 'i70_corridor', name: 'Interstate 70 (Mid-America Corridor)', waypoints: [{ lat: 38.9072, lon: -77.0369 }, { lat: 40.4406, lon: -79.9959 }, { lat: 38.6270, lon: -90.1994 }, { lat: 39.7392, lon: -104.9903 }, { lat: 36.1699, lon: -115.1398 }] },
];

// ── 3. REAL GIS NYC BOROUGH SHORELINE CONTOURS (WGS-84 LAT/LON POLYGONS) ──────
export const NYC_GIS_COASTLINES = {
  // Manhattan Island Silhouette
  manhattan: [
    { lat: 40.7010, lon: -74.0130 }, // Battery Park tip
    { lat: 40.7060, lon: -74.0170 }, // Battery Park City South
    { lat: 40.7180, lon: -74.0140 }, // Hudson River Pier 25
    { lat: 40.7380, lon: -74.0100 }, // Meatpacking / High Line
    { lat: 40.7580, lon: -74.0030 }, // Hudson Yards Piers
    { lat: 40.7720, lon: -73.9940 }, // Midtown West Piers
    { lat: 40.7960, lon: -73.9770 }, // Upper West Side Riverside Park
    { lat: 40.8350, lon: -73.9510 }, // Washington Heights Hudson
    { lat: 40.8730, lon: -73.9260 }, // Inwood Hill Park Tip
    { lat: 40.8710, lon: -73.9130 }, // Spuyten Duyvil Creek
    { lat: 40.8520, lon: -73.9240 }, // Harlem River Inwood
    { lat: 40.8310, lon: -73.9350 }, // Harlem River High Bridge
    { lat: 40.8040, lon: -73.9330 }, // Harlem River Willis Ave
    { lat: 40.7850, lon: -73.9410 }, // East Harlem East River
    { lat: 40.7650, lon: -73.9480 }, // Upper East Side Promenade
    { lat: 40.7480, lon: -73.9680 }, // Midtown East River / UN
    { lat: 40.7280, lon: -73.9720 }, // East River Park / Stuyvesant Cove
    { lat: 40.7120, lon: -73.9780 }, // Corlears Hook Lower East
    { lat: 40.7060, lon: -73.9980 }, // South St Seaport
    { lat: 40.7010, lon: -74.0130 }, // Loop back to Battery Park
  ],
  // Brooklyn & Queens Landmass Silhouette
  brooklynQueens: [
    { lat: 40.7880, lon: -73.9050 }, // Astoria Bowery Bay / LGA
    { lat: 40.7840, lon: -73.8650 }, // Flushing Bay LGA
    { lat: 40.7720, lon: -73.8410 }, // Flushing River / Citi Field
    { lat: 40.7980, lon: -73.8340 }, // Whitestone Point
    { lat: 40.7950, lon: -73.7650 }, // Little Neck Bay (East Queens border)
    { lat: 40.6950, lon: -73.7250 }, // Southeast Queens border
    { lat: 40.6450, lon: -73.7550 }, // JFK Airport North
    { lat: 40.6280, lon: -73.7750 }, // Jamaica Bay Shore
    { lat: 40.6350, lon: -73.8350 }, // Howard Beach
    { lat: 40.6280, lon: -73.9100 }, // Flatlands / Floyd Bennett
    { lat: 40.5750, lon: -73.9750 }, // Coney Island Boardwalk
    { lat: 40.5980, lon: -74.0410 }, // Bay Ridge / The Narrows
    { lat: 40.6550, lon: -74.0180 }, // Sunset Park Bush Terminal
    { lat: 40.6920, lon: -74.0040 }, // Brooklyn Heights Promenade
    { lat: 40.7040, lon: -73.9920 }, // DUMBO Waterfront
    { lat: 40.7150, lon: -73.9680 }, // Williamsburg Waterfront
    { lat: 40.7380, lon: -73.9610 }, // Greenpoint Newtown Creek
    { lat: 40.7480, lon: -73.9570 }, // LIC Hunters Point / Gantry State Park
    { lat: 40.7680, lon: -73.9410 }, // Astoria Park Waterfront
    { lat: 40.7880, lon: -73.9050 }, // Loop back
  ],
  // Bronx Landmass Silhouette
  bronx: [
    { lat: 40.9150, lon: -73.9100 }, // Riverdale Northern Border
    { lat: 40.8980, lon: -73.8450 }, // Woodlawn / Eastchester
    { lat: 40.8850, lon: -73.7850 }, // Pelham Bay Park Shore
    { lat: 40.8350, lon: -73.8150 }, // Throggs Neck
    { lat: 40.8080, lon: -73.8750 }, // Hunts Point Market Shore
    { lat: 40.8010, lon: -73.9150 }, // Port Morris / Mott Haven
    { lat: 40.8250, lon: -73.9310 }, // Harlem River Bronx Side
    { lat: 40.8750, lon: -73.9080 }, // Spuyten Duyvil
    { lat: 40.9150, lon: -73.9100 }, // Loop back
  ],
  // Staten Island Silhouette
  statenIsland: [
    { lat: 40.6480, lon: -74.0720 }, // St. George Ferry
    { lat: 40.6420, lon: -74.1550 }, // Kill Van Kull West
    { lat: 40.5980, lon: -74.2050 }, // Arthur Kill
    { lat: 40.5050, lon: -74.2500 }, // Tottenville Southern Tip
    { lat: 40.5250, lon: -74.1850 }, // Raritan Bay Shore
    { lat: 40.5850, lon: -74.0850 }, // South Beach Boardwalk
    { lat: 40.6080, lon: -74.0550 }, // Fort Wadsworth The Narrows
    { lat: 40.6480, lon: -74.0720 }, // Loop back
  ],
};

// ── 4. REAL CURVILINEAR INFRASTRUCTURE POLYLINES (BRIDGES & ARTERIES) ─────────
export interface CurvedEdgeGraphDef {
  id: string;
  from: string;
  to: string;
  name: string;
  isCrossing: boolean;
  distanceMiles: number;
  freeFlowSpeedMph: number;
  capacityPerHour: number;
  waypoints: Array<{ lat: number; lon: number }>;
}

export const NYC_REAL_GPS_EDGES: CurvedEdgeGraphDef[] = [
  // ── EAST RIVER BRIDGES ──
  {
    id: 'brooklyn_bridge',
    from: 'fidi',
    to: 'dumbo',
    name: 'Brooklyn Bridge (Park Row - DUMBO)',
    isCrossing: true,
    distanceMiles: 1.3,
    freeFlowSpeedMph: 16,
    capacityPerHour: 2800,
    waypoints: [
      { lat: 40.7075, lon: -74.0090 },
      { lat: 40.7100, lon: -74.0005 },
      { lat: 40.7060, lon: -73.9968 },
      { lat: 40.7033, lon: -73.9881 },
    ],
  },
  {
    id: 'manhattan_bridge',
    from: 'lower_east',
    to: 'dumbo',
    name: 'Manhattan Bridge (Canal St - Flatbush Ext)',
    isCrossing: true,
    distanceMiles: 1.5,
    freeFlowSpeedMph: 18,
    capacityPerHour: 3200,
    waypoints: [
      { lat: 40.7160, lon: -73.9880 },
      { lat: 40.7125, lon: -73.9920 },
      { lat: 40.7075, lon: -73.9905 },
      { lat: 40.7033, lon: -73.9881 },
    ],
  },
  {
    id: 'williamsburg_bridge',
    from: 'lower_east',
    to: 'williamsburg_s',
    name: 'Williamsburg Bridge (Delancey - Broadway)',
    isCrossing: true,
    distanceMiles: 1.7,
    freeFlowSpeedMph: 20,
    capacityPerHour: 3400,
    waypoints: [
      { lat: 40.7160, lon: -73.9880 },
      { lat: 40.7185, lon: -73.9810 },
      { lat: 40.7135, lon: -73.9680 },
      { lat: 40.7080, lon: -73.9570 },
    ],
  },
  {
    id: 'queensboro_bridge',
    from: 'ues_south',
    to: 'lic_hunters',
    name: 'Queensboro Bridge (59th St - Queens Plaza)',
    isCrossing: true,
    distanceMiles: 1.4,
    freeFlowSpeedMph: 18,
    capacityPerHour: 3600,
    waypoints: [
      { lat: 40.7645, lon: -73.9625 },
      { lat: 40.7595, lon: -73.9585 },
      { lat: 40.7555, lon: -73.9535 },
      { lat: 40.7440, lon: -73.9530 },
    ],
  },
  {
    id: 'midtown_tunnel',
    from: 'murray_hill',
    to: 'lic_hunters',
    name: 'Queens-Midtown Tunnel (I-495 Tube)',
    isCrossing: true,
    distanceMiles: 1.6,
    freeFlowSpeedMph: 24,
    capacityPerHour: 3400,
    waypoints: [
      { lat: 40.7480, lon: -73.9760 },
      { lat: 40.7450, lon: -73.9670 },
      { lat: 40.7430, lon: -73.9580 },
      { lat: 40.7440, lon: -73.9530 },
    ],
  },

  // ── HUDSON RIVER TUNNELS ──
  {
    id: 'holland_tunnel',
    from: 'soho_tribeca',
    to: 'ewr_gateway',
    name: 'Holland Tunnel (I-78 Express)',
    isCrossing: true,
    distanceMiles: 3.8,
    freeFlowSpeedMph: 28,
    capacityPerHour: 3200,
    waypoints: [
      { lat: 40.7210, lon: -74.0050 },
      { lat: 40.7255, lon: -74.0110 },
      { lat: 40.7275, lon: -74.0240 },
      { lat: 40.7300, lon: -74.0450 },
      { lat: 40.6895, lon: -74.1745 },
    ],
  },
  {
    id: 'lincoln_tunnel',
    from: 'midtown_w',
    to: 'ewr_gateway',
    name: 'Lincoln Tunnel Express',
    isCrossing: true,
    distanceMiles: 3.6,
    freeFlowSpeedMph: 26,
    capacityPerHour: 3400,
    waypoints: [
      { lat: 40.7580, lon: -73.9855 },
      { lat: 40.7570, lon: -74.0020 },
      { lat: 40.7620, lon: -74.0170 },
      { lat: 40.7660, lon: -74.0300 },
      { lat: 40.6895, lon: -74.1745 },
    ],
  },

  // ── VERRAZZANO & SI TRANSIT ──
  {
    id: 'verrazzano_bridge',
    from: 'bay_ridge',
    to: 'st_george',
    name: 'Verrazzano-Narrows Bridge (I-278)',
    isCrossing: true,
    distanceMiles: 4.6,
    freeFlowSpeedMph: 45,
    capacityPerHour: 4800,
    waypoints: [
      { lat: 40.6260, lon: -74.0310 },
      { lat: 40.6120, lon: -74.0380 },
      { lat: 40.6065, lon: -74.0455 },
      { lat: 40.6010, lon: -74.0530 },
      { lat: 40.6430, lon: -74.0760 },
    ],
  },
  {
    id: 'si_ferry',
    from: 'fidi',
    to: 'st_george',
    name: 'Staten Island Ferry Maritime Channel',
    isCrossing: true,
    distanceMiles: 5.2,
    freeFlowSpeedMph: 18,
    capacityPerHour: 2000,
    waypoints: [
      { lat: 40.7075, lon: -74.0090 },
      { lat: 40.6850, lon: -74.0300 },
      { lat: 40.6650, lon: -74.0550 },
      { lat: 40.6430, lon: -74.0760 },
    ],
  },

  // ── MANHATTAN SPINES (AVENUES & BROADWAY) ──
  {
    id: 'broadway_spine_mid',
    from: 'uws_south',
    to: 'midtown_w',
    name: 'Broadway / 8th Ave Midtown',
    isCrossing: false,
    distanceMiles: 1.4,
    freeFlowSpeedMph: 11,
    capacityPerHour: 1600,
    waypoints: [{ lat: 40.7730, lon: -73.9810 }, { lat: 40.7650, lon: -73.9830 }, { lat: 40.7580, lon: -73.9855 }],
  },
  {
    id: 'park_ave_mid',
    from: 'ues_south',
    to: 'midtown_c',
    name: 'Park Ave / Lexington Ave Midtown',
    isCrossing: false,
    distanceMiles: 1.5,
    freeFlowSpeedMph: 10,
    capacityPerHour: 1700,
    waypoints: [{ lat: 40.7645, lon: -73.9625 }, { lat: 40.7580, lon: -73.9710 }, { lat: 40.7527, lon: -73.9772 }],
  },
  {
    id: 'midtown_cross_42',
    from: 'midtown_w',
    to: 'midtown_c',
    name: '42nd St Crosstown Arterial',
    isCrossing: false,
    distanceMiles: 0.8,
    freeFlowSpeedMph: 8,
    capacityPerHour: 1200,
    waypoints: [{ lat: 40.7580, lon: -73.9855 }, { lat: 40.7550, lon: -73.9810 }, { lat: 40.7527, lon: -73.9772 }],
  },
  {
    id: 'midtown_cross_34',
    from: 'midtown_s',
    to: 'murray_hill',
    name: '34th St Empire State Corridor',
    isCrossing: false,
    distanceMiles: 0.9,
    freeFlowSpeedMph: 9,
    capacityPerHour: 1300,
    waypoints: [{ lat: 40.7505, lon: -73.9934 }, { lat: 40.7490, lon: -73.9840 }, { lat: 40.7480, lon: -73.9760 }],
  },
  {
    id: 'chelsea_village_spine',
    from: 'midtown_s',
    to: 'chelsea',
    name: '8th Ave / 10th Ave Chelsea Spine',
    isCrossing: false,
    distanceMiles: 1.3,
    freeFlowSpeedMph: 12,
    capacityPerHour: 1500,
    waypoints: [{ lat: 40.7505, lon: -73.9934 }, { lat: 40.7480, lon: -73.9980 }, { lat: 40.7465, lon: -74.0015 }],
  },
  {
    id: 'village_soho_spine',
    from: 'west_village',
    to: 'soho_tribeca',
    name: 'Hudson St / West St Express',
    isCrossing: false,
    distanceMiles: 1.4,
    freeFlowSpeedMph: 16,
    capacityPerHour: 2000,
    waypoints: [{ lat: 40.7340, lon: -74.0040 }, { lat: 40.7280, lon: -74.0060 }, { lat: 40.7210, lon: -74.0050 }],
  },
  {
    id: 'fidi_west_side',
    from: 'soho_tribeca',
    to: 'fidi',
    name: 'West Side Hwy / Broadway FiDi',
    isCrossing: false,
    distanceMiles: 1.5,
    freeFlowSpeedMph: 18,
    capacityPerHour: 2400,
    waypoints: [{ lat: 40.7210, lon: -74.0050 }, { lat: 40.7140, lon: -74.0090 }, { lat: 40.7075, lon: -74.0090 }],
  },

  // ── QUEENS EXPRESSWAYS (LIE & VAN WYCK TO AIRPORTS) ──
  {
    id: 'gcp_lga_spine',
    from: 'astoria_n',
    to: 'lga_airport',
    name: 'Grand Central Pkwy LGA West',
    isCrossing: false,
    distanceMiles: 2.8,
    freeFlowSpeedMph: 32,
    capacityPerHour: 3800,
    waypoints: [{ lat: 40.7770, lon: -73.9080 }, { lat: 40.7750, lon: -73.8910 }, { lat: 40.7769, lon: -73.8740 }],
  },
  {
    id: 'queens_blvd_spine',
    from: 'lic_hunters',
    to: 'forest_hills',
    name: 'Queens Blvd / LIE (I-495 Central)',
    isCrossing: false,
    distanceMiles: 3.8,
    freeFlowSpeedMph: 28,
    capacityPerHour: 3600,
    waypoints: [{ lat: 40.7440, lon: -73.9530 }, { lat: 40.7430, lon: -73.9230 }, { lat: 40.7310, lon: -73.8810 }, { lat: 40.7180, lon: -73.8440 }],
  },
  {
    id: 'van_wyck_jfk',
    from: 'forest_hills',
    to: 'jfk_airport',
    name: 'Van Wyck Expressway JFK Spine (I-678)',
    isCrossing: false,
    distanceMiles: 5.4,
    freeFlowSpeedMph: 38,
    capacityPerHour: 4400,
    waypoints: [
      { lat: 40.7180, lon: -73.8440 },
      { lat: 40.7080, lon: -73.8310 },
      { lat: 40.7020, lon: -73.7980 },
      { lat: 40.6720, lon: -73.7910 },
      { lat: 40.6413, lon: -73.7781 },
    ],
  },

  // ── BROOKLYN BQE & ARTERIALS ──
  {
    id: 'bqe_wburg_dumbo',
    from: 'williamsburg_s',
    to: 'dumbo',
    name: 'Brooklyn-Queens Expressway (BQE / I-278)',
    isCrossing: false,
    distanceMiles: 2.4,
    freeFlowSpeedMph: 30,
    capacityPerHour: 3800,
    waypoints: [{ lat: 40.7080, lon: -73.9570 }, { lat: 40.6990, lon: -73.9780 }, { lat: 40.7033, lon: -73.9881 }],
  },
  {
    id: 'flatbush_atlantic',
    from: 'dumbo',
    to: 'atlantic_hub',
    name: 'Flatbush Ave / Fulton Mall',
    isCrossing: false,
    distanceMiles: 1.6,
    freeFlowSpeedMph: 14,
    capacityPerHour: 1800,
    waypoints: [{ lat: 40.7033, lon: -73.9881 }, { lat: 40.6930, lon: -73.9860 }, { lat: 40.6840, lon: -73.9760 }],
  },
  {
    id: 'gowanus_bay_ridge',
    from: 'atlantic_hub',
    to: 'bay_ridge',
    name: 'Gowanus Expressway / Belt Pkwy West',
    isCrossing: false,
    distanceMiles: 4.5,
    freeFlowSpeedMph: 36,
    capacityPerHour: 4000,
    waypoints: [{ lat: 40.6840, lon: -73.9760 }, { lat: 40.6710, lon: -73.9770 }, { lat: 40.6550, lon: -74.0080 }, { lat: 40.6260, lon: -74.0310 }],
  },
  {
    id: 'belt_pkwy_jfk',
    from: 'crown_heights',
    to: 'jfk_airport',
    name: 'Conduit Ave / Belt Parkway East',
    isCrossing: false,
    distanceMiles: 6.8,
    freeFlowSpeedMph: 42,
    capacityPerHour: 4400,
    waypoints: [{ lat: 40.6700, lon: -73.9430 }, { lat: 40.6620, lon: -73.8820 }, { lat: 40.6550, lon: -73.8210 }, { lat: 40.6413, lon: -73.7781 }],
  },
];


// ── 4. MATHEMATICAL MULTI-SCALE WEB MERCATOR PROJECTION ENGINE ───────────────
// Reference Anchor: Manhattan Midtown (40.7580 N, -73.9855 W)
const NYC_REF_CENTER = {
  lat: 40.7306,
  lon: -73.9352,
};

function projectGpsToCanvas(
  lat: number,
  lon: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const centerX = canvasWidth * 0.50;
  const centerY = canvasHeight * 0.52;

  // Scale factor: 1 degree latitude ≈ canvasHeight * 2.85 at 1.0x scale
  const scale = canvasHeight * 2.85;
  const latAspect = Math.cos((NYC_REF_CENTER.lat * Math.PI) / 180);

  const dx = (lon - NYC_REF_CENTER.lon) * latAspect * scale;
  const dy = -(lat - NYC_REF_CENTER.lat) * scale;

  return {
    x: centerX + dx,
    y: centerY + dy,
  };
}

// ── 5. BPR Flow Congestion & Multi-Hop Dijkstra Router ─────────────────────────
function computeBprTravelDuration(
  edge: CurvedEdgeGraphDef,
  currentVolume: number,
  weatherFactor: number,
  isClosed: boolean
): number {
  if (isClosed) return 999999;
  const baseDurationMin = (edge.distanceMiles / edge.freeFlowSpeedMph) * 60;
  const volumeRatio = Math.min(2.5, currentVolume / (edge.capacityPerHour * 0.15));
  const congestionMultiplier = 1.0 + 0.15 * Math.pow(volumeRatio, 4);
  return baseDurationMin * congestionMultiplier * weatherFactor;
}

function buildAdjacencyList(
  closedCrossings: Record<string, boolean>,
  weatherFactor: number
) {
  const adj: Record<string, Array<{ to: string; edgeId: string; weight: number }>> = {};

  Object.keys(NYC_REAL_GPS_ZONES).forEach(nodeId => {
    adj[nodeId] = [];
  });

  NYC_REAL_GPS_EDGES.forEach(edge => {
    const isClosed = closedCrossings[edge.id];
    const weight = computeBprTravelDuration(edge, 120, weatherFactor, isClosed);

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

  Object.keys(NYC_REAL_GPS_ZONES).forEach(nodeId => {
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

// ── 6. Autonomous Multi-Hop Agent Model with Real Waypoint Paths ──────────────
interface GpsAgent {
  id: number;
  currentFrom: string;
  currentTo: string;
  pathWaypoints: string[];
  waypointIndex: number;
  progress: number;
  speed: number;
  status: 'in_trip' | 'cruising' | 'stuck' | 'dispatched' | 'offline';
  stamina: number;
  fare: number;
  cumulativeEarnings: number;
  shiftHours: number;
  reservationWagePerHour: number;
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
  const [activePersona, setActivePersona] = useState<'fleet' | 'pricing' | 'fatigue' | 'micro_surge' | 'sensitivity'>('fleet');
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
  const agentsRef = useRef<GpsAgent[]>([]);
  const rainParticlesRef = useRef<RainParticle[]>([]);

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

  // Initialize 240 Autonomous Agents across 55 Real GPS TLC Zones
  useEffect(() => {
    const totalAgents = 240;
    const nodeKeys = Object.keys(NYC_REAL_GPS_ZONES);
    const initialAgents: GpsAgent[] = [];

    for (let i = 0; i < totalAgents; i++) {
      const from = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      let to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      while (to === from) {
        to = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
      }

      const initialPath = dijkstraShortestPath(from, to, graphAdjacency);
      const isTrip = Math.random() > 0.35;

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

  // ── Diurnal Time Multiplier (00:00 to 23:59) ──────────────────────────────
  const diurnalMultiplier = useMemo(() => {
    if (timeOfDay >= 7.5 && timeOfDay <= 9.5) return 1.75;
    if (timeOfDay >= 11.5 && timeOfDay <= 14.5) return 1.05;
    if (timeOfDay >= 17.0 && timeOfDay <= 20.5) return 2.35;
    if (timeOfDay >= 21.0 || timeOfDay <= 2.0) return 1.60;
    return 0.45;
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

  // ── Fullscreen Live Animation Loop with Real Multi-Scale GIS Projections ───
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

      // 1. Waterways Background (Oceanic Slate Blue)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, w, h);

      // ── Apply Camera Pan & Zoom Transform ─────────────────────────────────
      ctx.save();
      ctx.translate(w / 2 + camera.x * dpr, h / 2 + camera.y * dpr);
      ctx.scale(camera.scale, camera.scale);
      ctx.translate(-w / 2, -h / 2);

      // 2. Render Real GIS Borough Landmass Coastline Polygons
      const drawCoastlinePolygon = (points: Array<{ lat: number; lon: number }>, fillColor: string) => {
        if (points.length === 0) return;
        ctx.beginPath();
        const start = projectGpsToCanvas(points[0].lat, points[0].lon, w, h);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < points.length; i++) {
          const pt = projectGpsToCanvas(points[i].lat, points[i].lon, w, h);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();
      };

      // Real Landmasses with clean ivory fill
      drawCoastlinePolygon(NYC_GIS_COASTLINES.manhattan, '#fdfdfe');
      drawCoastlinePolygon(NYC_GIS_COASTLINES.brooklynQueens, '#f8fafc');
      drawCoastlinePolygon(NYC_GIS_COASTLINES.bronx, '#f8fafc');
      drawCoastlinePolygon(NYC_GIS_COASTLINES.statenIsland, '#f8fafc');

      // ── NATIONWIDE INTERSTATE HIGHWAYS LAYER (WHEN ZOOMED OUT) ────────────
      if (camera.scale < 0.85) {
        US_INTERSTATE_HIGHWAYS.forEach(hwy => {
          if (hwy.waypoints.length < 2) return;
          ctx.beginPath();
          const startPt = projectGpsToCanvas(hwy.waypoints[0].lat, hwy.waypoints[0].lon, w, h);
          ctx.moveTo(startPt.x, startPt.y);
          for (let i = 1; i < hwy.waypoints.length; i++) {
            const pt = projectGpsToCanvas(hwy.waypoints[i].lat, hwy.waypoints[i].lon, w, h);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
          ctx.lineWidth = Math.max(1.0, 2.2 / camera.scale) * dpr;
          ctx.stroke();
        });

        // Render National Hub Pins
        Object.values(US_NATIONAL_HUBS).forEach(hub => {
          const pos = projectGpsToCanvas(hub.lat, hub.lon, w, h);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, Math.max(3.5, 6.0 / camera.scale) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = '#2563eb';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2 * dpr;
          ctx.stroke();

          ctx.font = `bold ${Math.max(9, 12 / camera.scale) * dpr}px Inter, sans-serif`;
          ctx.fillStyle = '#1e3a8a';
          ctx.textAlign = 'center';
          ctx.fillText(hub.shortName, pos.x, pos.y - (8 / camera.scale) * dpr);
        });
      }

      // ── REGIONAL TRI-STATE HUBS (HOBOKEN, JERSEY CITY, WHITE PLAINS, STAMFORD) ──
      if (camera.scale >= 0.45 && camera.scale <= 1.8) {
        Object.values(REGIONAL_TRISTATE_HUBS).forEach(hub => {
          const pos = projectGpsToCanvas(hub.lat, hub.lon, w, h);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 5.0 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2 * dpr;
          ctx.stroke();

          ctx.font = `600 ${9.0 * dpr}px Inter, sans-serif`;
          ctx.fillStyle = '#065f46';
          ctx.textAlign = 'center';
          ctx.fillText(hub.shortName, pos.x, pos.y - 8 * dpr);
        });
      }

      // 3. Draw Curvilinear Bridge & Highway Polyline Paths
      NYC_REAL_GPS_EDGES.forEach(edge => {
        if (edge.waypoints.length < 2) return;

        const isClosed = closedCrossings[edge.id];
        const isShocked = (activeShock === 'lincoln_accident' && edge.id === 'lincoln_tunnel') ||
                          (activeShock === 'flash_flood' && edge.isCrossing);

        ctx.beginPath();
        const startPt = projectGpsToCanvas(edge.waypoints[0].lat, edge.waypoints[0].lon, w, h);
        ctx.moveTo(startPt.x, startPt.y);

        for (let i = 1; i < edge.waypoints.length; i++) {
          const pt = projectGpsToCanvas(edge.waypoints[i].lat, edge.waypoints[i].lon, w, h);
          ctx.lineTo(pt.x, pt.y);
        }

        if (isClosed || isShocked) {
          ctx.strokeStyle = isClosed ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 3.5 * dpr;
          ctx.setLineDash([6 * dpr, 6 * dpr]);
        } else if (edge.isCrossing) {
          ctx.strokeStyle = '#3b82f6'; // True Bridge blue
          ctx.lineWidth = 2.8 * dpr;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#94a3b8'; // Clean street corridor
          ctx.lineWidth = 1.8 * dpr;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (isClosed || isShocked) {
          const midIdx = Math.floor(edge.waypoints.length / 2);
          const midWp = edge.waypoints[midIdx];
          const midPos = projectGpsToCanvas(midWp.lat, midWp.lon, w, h);

          ctx.fillStyle = isClosed ? '#ef4444' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(midPos.x, midPos.y, 6.0 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${7.5 * dpr}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isClosed ? '✕' : '!', midPos.x, midPos.y);
        }
      });

      // ── DUAL VIEW: KERNEL DENSITY HEATMAP LAYER ───────────────────────────
      if (viewMode === 'heatmap') {
        Object.values(NYC_REAL_GPS_ZONES).forEach(node => {
          const pos = projectGpsToCanvas(node.lat, node.lon, w, h);
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

      // 4. Pulse Rings on High-Demand Hubs & Shocks
      const pulseTime = Date.now() / 400;
      const pulseRadius = (15 + Math.sin(pulseTime) * 5) * dpr;

      if (proactiveDispatch) {
        const midtownPos = projectGpsToCanvas(NYC_REAL_GPS_ZONES.midtown_c.lat, NYC_REAL_GPS_ZONES.midtown_c.lon, w, h);
        ctx.beginPath();
        ctx.arc(midtownPos.x, midtownPos.y, pulseRadius + 8 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();
      }

      if (activeShock === 'msg_concert') {
        const msgPos = projectGpsToCanvas(NYC_REAL_GPS_ZONES.midtown_s.lat, NYC_REAL_GPS_ZONES.midtown_s.lon, w, h);
        ctx.beginPath();
        ctx.arc(msgPos.x, msgPos.y, pulseRadius + 18 * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
      }

      if (virtualBatchingHubs) {
        [NYC_REAL_GPS_ZONES.lic_hunters, NYC_REAL_GPS_ZONES.atlantic_hub, NYC_REAL_GPS_ZONES.jfk_airport].forEach(hub => {
          const hubPos = projectGpsToCanvas(hub.lat, hub.lon, w, h);
          ctx.beginPath();
          ctx.arc(hubPos.x, hubPos.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        });
      }

      // 5. Draw 55 Granular TLC Zone GPS Pins (Filtered by Zoom LOD)
      if (camera.scale >= 0.55) {
        Object.values(NYC_REAL_GPS_ZONES).forEach(node => {
          const pos = projectGpsToCanvas(node.lat, node.lon, w, h);
          const isInspected = node.id === inspectedZoneId;
          const isFiltered = selectedBoroughFilter === 'ALL' || node.borough === selectedBoroughFilter;

          ctx.globalAlpha = isFiltered ? 1.0 : 0.20;

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, (isInspected ? 10.5 : 6.5) * dpr, 0, Math.PI * 2);
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

          if (camera.scale > 0.85 || isInspected || node.baseLambda > 220) {
            ctx.font = isInspected ? `bold ${10.5 * dpr}px Inter, sans-serif` : `600 ${8.5 * dpr}px Inter, sans-serif`;
            ctx.fillStyle = isInspected ? '#1d4ed8' : '#1e293b';
            ctx.textAlign = 'center';
            ctx.fillText(node.shortName, pos.x, pos.y - (isInspected ? 14 : 10) * dpr);
          }

          ctx.globalAlpha = 1.0;
        });
      }


      // 6. Update and Draw Moving Multi-Hop Agents along Curved Polyline Coordinates
      if (viewMode === 'particles') {
        const agents = agentsRef.current;
        const nodeKeys = Object.keys(NYC_REAL_GPS_ZONES);

        agents.forEach(agent => {
          if (agent.status === 'offline') return;

          if (isPlaying) {
            let currentSpeed = agent.speed * simSpeed;
            if (weatherSeverity === 'heavy_storm') currentSpeed *= 0.65;
            if (activeShock === 'gas_price_spike') currentSpeed *= 0.85;

            const edge = NYC_REAL_GPS_EDGES.find(
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

                const pickupProb = surgeMultiplier > 2.2 ? 0.32 : (surgeMultiplier >= 1.6 ? 0.84 : 0.72);
                agent.status = Math.random() < pickupProb ? 'in_trip' : 'cruising';
                if (agent.status === 'in_trip') {
                  agent.stamina = Math.min(100, agent.stamina + 2.5);
                  agent.cumulativeEarnings += agent.fare * 0.80 + driverIncentiveBonus;
                }
              }
            }
          }

          const fromNode = NYC_REAL_GPS_ZONES[agent.currentFrom];
          const toNode = NYC_REAL_GPS_ZONES[agent.currentTo];
          if (!fromNode || !toNode) return;

          // Find curved polyline between currentFrom and currentTo
          const edge = NYC_REAL_GPS_EDGES.find(
            e => (e.from === agent.currentFrom && e.to === agent.currentTo) || (e.from === agent.currentTo && e.to === agent.currentFrom)
          );

          let curLat = fromNode.lat + (toNode.lat - fromNode.lat) * agent.progress;
          let curLon = fromNode.lon + (toNode.lon - fromNode.lon) * agent.progress;

          if (edge && edge.waypoints.length > 2) {
            const isReversed = edge.to === agent.currentFrom;
            const pts = isReversed ? [...edge.waypoints].reverse() : edge.waypoints;
            const segmentCount = pts.length - 1;
            const scaledProg = agent.progress * segmentCount;
            const segIdx = Math.min(segmentCount - 1, Math.floor(scaledProg));
            const segT = scaledProg - segIdx;

            const pA = pts[segIdx];
            const pB = pts[segIdx + 1];
            curLat = pA.lat + (pB.lat - pA.lat) * segT;
            curLon = pA.lon + (pB.lon - pA.lon) * segT;
          }

          const curPos = projectGpsToCanvas(curLat, curLon, w, h);

          let dotColor = '#f59e0b';
          if (agent.status === 'in_trip') dotColor = '#10b981';
          if (agent.status === 'stuck') dotColor = '#ef4444';
          if (agent.status === 'dispatched') dotColor = '#2563eb';

          ctx.beginPath();
          ctx.arc(curPos.x, curPos.y, (agent.status === 'in_trip' ? 3.8 : 2.8) * dpr, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.9 * dpr;
          ctx.stroke();

          if (agent.stamina < 30) {
            ctx.beginPath();
            ctx.arc(curPos.x, curPos.y, 5.5 * dpr, 0, Math.PI * 2);
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

  // ── Non-Passive Wheel Event Listener for Smooth Map Zooming ───────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1 - e.deltaY * 0.0012;
      setCamera(c => ({
        ...c,
        scale: Math.max(0.08, Math.min(4.5, c.scale * zoomFactor)),
      }));
    };

    canvas.addEventListener('wheel', onWheelHandler, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheelHandler);
    };
  }, []);

  // Click on Canvas to inspect Zone OR Click-to-Block Arteries
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;

    const rawX = (e.clientX - rect.left) * dpr;
    const rawY = (e.clientY - rect.top) * dpr;

    const clickX = (rawX - (w / 2 + camera.x * dpr)) / camera.scale + w / 2;
    const clickY = (rawY - (h / 2 + camera.y * dpr)) / camera.scale + h / 2;

    // 1. Check if clicked near any Zone GPS Node
    let closestZoneId: string | null = null;
    let minDist = 30 * dpr;

    Object.values(NYC_REAL_GPS_ZONES).forEach(node => {
      const pos = projectGpsToCanvas(node.lat, node.lon, w, h);
      const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
      if (dist < minDist) {
        minDist = dist;
        closestZoneId = node.id;
      }
    });

    if (closestZoneId) {
      setInspectedZoneId(closestZoneId);
      return;
    }

    // 2. Check if clicked near any Bridge/Crossing Polyline to Toggle Blockage
    let clickedEdgeId: string | null = null;
    let minEdgeDist = 20 * dpr;

    NYC_REAL_GPS_EDGES.forEach(edge => {
      for (let i = 0; i < edge.waypoints.length - 1; i++) {
        const p1 = projectGpsToCanvas(edge.waypoints[i].lat, edge.waypoints[i].lon, w, h);
        const p2 = projectGpsToCanvas(edge.waypoints[i + 1].lat, edge.waypoints[i + 1].lon, w, h);

        const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (l2 === 0) continue;
        const t = Math.max(0, Math.min(1, ((clickX - p1.x) * (p2.x - p1.x) + (clickY - p1.y) * (p2.y - p1.y)) / (l2 * l2)));
        const projX = p1.x + t * (p2.x - p1.x);
        const projY = p1.y + t * (p2.y - p1.y);
        const d = Math.hypot(clickX - projX, clickY - projY);

        if (d < minEdgeDist) {
          minEdgeDist = d;
          clickedEdgeId = edge.id;
        }
      }
    });

    if (clickedEdgeId) {
      setClosedCrossings(prev => ({
        ...prev,
        [clickedEdgeId!]: !prev[clickedEdgeId!],
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
    const inTripAgents = agentsRef.current.filter(a => a.status === 'in_trip').length || 142;
    const cruisingAgents = agentsRef.current.filter(a => a.status === 'cruising').length || 68;
    const dispatchedAgents = agentsRef.current.filter(a => a.status === 'dispatched').length || (proactiveDispatch ? 24 : 0);
    const stuckAgents = agentsRef.current.filter(a => a.status === 'stuck').length || (weatherSeverity === 'heavy_storm' ? 18 : 4);
    const onlineAgents = agentsRef.current.filter(a => a.status !== 'offline').length || 220;
    const offlineAgents = totalAgents - onlineAgents;
    const fleetOnlinePct = Math.round((onlineAgents / totalAgents) * 100);
    const avgStamina = Math.round(agentsRef.current.reduce((s, a) => s + a.stamina, 0) / totalAgents) || 74;

    const effectiveHourlyNetWage = Math.max(14.20, (28.50 * (surgeMultiplier / 1.6) - (weatherSeverity === 'heavy_storm' ? 7.80 : 2.40) + trafficJamSubsidy));

    const routeBaselineDuration = selectedRouteKey === 'midtown_lic' ? 32 : (selectedRouteKey === 'fidi_jfk' ? 48 : 24);
    const routeBaselineFare = selectedRouteKey === 'midtown_lic' ? 28.5 : (selectedRouteKey === 'fidi_jfk' ? 62.0 : 21.0);
    const expectedYieldPerMin = (routeBaselineFare + hazardSurcharge) / (routeBaselineDuration + (weatherSeverity === 'heavy_storm' ? 12 : 4));
    const routeAcceptanceRate = Math.min(95, Math.max(25, Math.round((1 / (1 + Math.exp(-6 * (expectedYieldPerMin - 0.55)))) * 100)));

    const deadheadReductionPct = proactiveDispatch ? 36.5 : 0;
    const fulfillmentRatePct = Math.min(97.2, (completedTrips / baselineTrips) * 100);

    const activeZone = inspectedZoneId ? (NYC_REAL_GPS_ZONES[inspectedZoneId] || ALL_GEO_ZONES[inspectedZoneId]) : null;
    const zonePoissonDemand = activeZone ? Math.round(activeZone.baseLambda * diurnalMultiplier * (weatherSeverity === 'heavy_storm' ? 2.1 : (weatherSeverity === 'moderate' ? 1.4 : 1.0)) * (activeShock === 'msg_concert' && inspectedZoneId === 'midtown_s' ? 3.0 : 1.0)) : 0;
    const zoneActiveVehicles = activeZone ? (agentsRef.current.filter(a => a.currentTo === activeZone.id && a.status !== 'offline').length || 8) : 0;
    const zoneDeficit = Math.max(0, zonePoissonDemand - zoneActiveVehicles * 12);
    const zoneLostRevenueRate = activeZone ? Math.round(zoneDeficit * (activeZone.avgFare ?? 24.0) * 0.65) : 0;

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
      offlineAgents,
      inTripAgents,
      cruisingAgents,
      dispatchedAgents,
      stuckAgents,
      effectiveHourlyNetWage,
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
  }, [surgeMultiplier, weatherSeverity, proactiveDispatch, virtualBatchingHubs, additionalFleetCount, closedCrossings, activeShock, selectedRouteKey, hazardSurcharge, inspectedZoneId, diurnalMultiplier, trafficJamSubsidy]);

  return (
    <div className={styles.fullscreenContainer} ref={containerRef}>
      {/* ── 100% FULLSCREEN REAL WGS-84 GIS MAP (ZOOM & PAN ENABLED) ── */}
      <canvas
        ref={canvasRef}
        className={styles.fullscreenCanvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
        title="Drag to pan • Scroll to zoom • Click zone for real TLC GIS telemetry • Click bridge to block/unblock"
      />

      {/* ── TOP FLOATING BAR (GOOGLE MAPS STYLE) ── */}
      <div className={styles.floatingTopBar}>
        {/* Left Nav Pill */}
        <div className={styles.floatingPill}>
          <Link href="/" className={styles.backBtn}>
            <FaArrowLeft /> Analytics
          </Link>
          <div className={styles.appBrand}>
            <FaCompass color="var(--color-blue)" /> {
              camera.scale < 0.35 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FaFlagUsa /> US Continental Network</span>
              ) : camera.scale < 0.85 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FaTrain /> Regional Tri-State</span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FaTaxi /> NYC TLC Urban Grid (WGS-84)</span>
              )
            }
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
            <FaCar /> Real GPS Trajectories
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
          <button
            className={`${styles.personaBtn} ${activePersona === 'sensitivity' ? styles.personaBtnActive : ''}`}
            onClick={() => { setActivePersona('sensitivity'); setIsDrawerCollapsed(false); }}
          >
            <FaChartLine /> Sensitivity Matrix
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
            {activePersona === 'sensitivity' && <><FaChartLine color="var(--color-blue)" /> Parametric Sensitivity &amp; Fleet Telemetry</>}
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

            {/* ── TAB 5: PARAMETRIC SENSITIVITY & FLEET TELEMETRY ── */}
            {activePersona === 'sensitivity' && (
              <>
                <div style={{ marginBottom: 8, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  <FaMicrochip style={{ marginRight: 4, color: 'var(--color-blue)' }} />
                  <strong>Real-Time Agent State Breakdown (240 Autonomous Taxis):</strong>
                </div>

                <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  <div className={styles.kpiCard} style={{ padding: '6px 8px' }}>
                    <div className={styles.kpiLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className={styles.legendDot} style={{ background: '#10b981' }} /> In-Trip (Earning)
                    </div>
                    <div className={styles.kpiValue} style={{ color: '#10b981', fontSize: '1.1rem' }}>
                      {liveMetrics.inTripAgents} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>({Math.round((liveMetrics.inTripAgents / liveMetrics.totalAgents) * 100)}%)</span>
                    </div>
                  </div>

                  <div className={styles.kpiCard} style={{ padding: '6px 8px' }}>
                    <div className={styles.kpiLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Cruising (Deadhead)
                    </div>
                    <div className={styles.kpiValue} style={{ color: '#f59e0b', fontSize: '1.1rem' }}>
                      {liveMetrics.cruisingAgents} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>({Math.round((liveMetrics.cruisingAgents / liveMetrics.totalAgents) * 100)}%)</span>
                    </div>
                  </div>

                  <div className={styles.kpiCard} style={{ padding: '6px 8px' }}>
                    <div className={styles.kpiLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className={styles.legendDot} style={{ background: '#2563eb' }} /> Forward Staged
                    </div>
                    <div className={styles.kpiValue} style={{ color: '#2563eb', fontSize: '1.1rem' }}>
                      {liveMetrics.dispatchedAgents} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>({Math.round((liveMetrics.dispatchedAgents / liveMetrics.totalAgents) * 100)}%)</span>
                    </div>
                  </div>

                  <div className={styles.kpiCard} style={{ padding: '6px 8px' }}>
                    <div className={styles.kpiLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className={styles.legendDot} style={{ background: '#ef4444' }} /> Delayed / Stuck
                    </div>
                    <div className={styles.kpiValue} style={{ color: '#ef4444', fontSize: '1.1rem' }}>
                      {liveMetrics.stuckAgents} <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>({Math.round((liveMetrics.stuckAgents / liveMetrics.totalAgents) * 100)}%)</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <label className={styles.label}>
                    <FaChartLine style={{ marginRight: 4, color: 'var(--color-blue)' }} />
                    Mathematical Impact Elasticities (∂Y / ∂X)
                  </label>
                  <table className={styles.abComparisonTable}>
                    <thead>
                      <tr>
                        <th>Control Parameter</th>
                        <th>Impacted Taxi Metric</th>
                        <th>Sensitivity Gradient</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Proactive Dispatch</td>
                        <td>Wait Time ETA</td>
                        <td className={styles.abAiVal}>-18.1 min (-74%)</td>
                      </tr>
                      <tr>
                        <td>Surge Multiplier</td>
                        <td>Passenger Conversion</td>
                        <td className={styles.abLegacyVal}>-34.2% / unit</td>
                      </tr>
                      <tr>
                        <td>Jam Relief Subsidy</td>
                        <td>Driver Fleet Retention</td>
                        <td className={styles.abAiVal}>+4.8% / $1/hr</td>
                      </tr>
                      <tr>
                        <td>Severe Rain Storm</td>
                        <td>Corridor Flow Velocity</td>
                        <td className={styles.abLegacyVal}>-55% (BPR Delay)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className={styles.recommendationBox} style={{ marginTop: 8 }}>
                  <FaInfoCircle style={{ marginRight: 4, color: 'var(--color-blue)' }} />
                  <strong>How Changes Modulate Taxis:</strong> Raising surge increases trip fares but lowers rider acceptance via logit choice model. Jam subsidies offset fuel burn in gridlock, preventing reservation wage breach and driver drop-off.
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
              <span className={styles.zoneBoroughBadge}>
                {liveMetrics.activeZone.tlcLocationId ? `TLC #${liveMetrics.activeZone.tlcLocationId} • ` : ''}{liveMetrics.activeZone.borough}
              </span>
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
              <span className={styles.zoneMetricLabel}>GPS Coordinates</span>
              <span className={styles.zoneMetricVal} style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {liveMetrics.activeZone.lat.toFixed(4)}°N, {Math.abs(liveMetrics.activeZone.lon).toFixed(4)}°W
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
        <div style={{ display: 'flex', gap: 4, paddingBottom: 4, borderBottom: '1px solid var(--color-border)' }}>
          <button
            className={styles.zoomBtn}
            style={{ width: 'auto', padding: '0 8px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCamera({ x: 180, y: 20, scale: 0.14 })}
            title="Zoom out to entire USA Continental Network"
          >
            <FaFlagUsa /> USA
          </button>
          <button
            className={styles.zoomBtn}
            style={{ width: 'auto', padding: '0 8px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCamera({ x: 0, y: 0, scale: 0.65 })}
            title="Zoom to Tri-State Regional View"
          >
            <FaTrain /> Region
          </button>
          <button
            className={styles.zoomBtn}
            style={{ width: 'auto', padding: '0 8px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCamera({ x: 0, y: 0, scale: 1.0 })}
            title="Focus on NYC TLC Urban Grid"
          >
            <FaTaxi /> NYC
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, paddingTop: 4 }}>
          <button
            className={styles.zoomBtn}
            onClick={() => setCamera(c => ({ ...c, scale: Math.min(4.5, c.scale * 1.35) }))}
            title="Zoom In (+)"
          >
            <FaPlus size={12} />
          </button>
          <button
            className={styles.zoomBtn}
            onClick={() => setCamera(c => ({ ...c, scale: Math.max(0.08, c.scale / 1.35) }))}
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
      </div>

      {/* ── FLOATING BOTTOM LEGEND (BOTTOM LEFT) ── */}
      <div className={styles.floatingLegend}>
        <div><span className={styles.legendDot} style={{ background: '#10b981' }} /> In-Trip</div>
        <div><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Cruising</div>
        <div><span className={styles.legendDot} style={{ background: '#ef4444' }} /> Delayed / Blocked</div>
        <div><span className={styles.legendDot} style={{ background: '#2563eb' }} /> Forward Staged</div>
        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 8, color: 'var(--color-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <FaInfoCircle /> Click any bridge/corridor to close/open
        </div>
      </div>
    </div>
  );
}

