// src/lib/data.ts
// Utility functions to load JSON data from public/data/
// All data is statically served – no server needed.

import type {
  ZoneRevenue, HourlyDemand, BoroughSummary, MonthlyTrend,
  UnitEconomics, DailyHeatmap, SimulatorBase, BenchmarkResults,
  DataSummary, TopRoute,
} from '@/types';

const BASE = '/data';

async function fetchJson<T>(filename: string): Promise<T> {
  const res = await fetch(`${BASE}/${filename}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed to load ${filename}: ${res.status}`);
  return res.json();
}

export const getData = {
  zoneRevenue:        () => fetchJson<ZoneRevenue[]>('zone_revenue.json'),
  hourlyDemand:       () => fetchJson<HourlyDemand[]>('hourly_demand.json'),
  boroughSummary:     () => fetchJson<BoroughSummary[]>('borough_summary.json'),
  monthlyTrends:      () => fetchJson<MonthlyTrend[]>('monthly_trends.json'),
  unitEconomics:      () => fetchJson<UnitEconomics[]>('unit_economics.json'),
  dailyHeatmap:       () => fetchJson<DailyHeatmap[]>('daily_heatmap.json'),
  simulatorBase:      () => fetchJson<SimulatorBase[]>('simulator_base.json'),
  benchmarkResults:   () => fetchJson<BenchmarkResults>('benchmark_results.json'),
  dataSummary:        () => fetchJson<DataSummary>('data_summary.json'),
  topRoutes:          () => fetchJson<TopRoute[]>('top_routes.json'),
  marketShare:        () => fetchJson<import('@/types').MarketShare[]>('market_share.json'),
  boroughMarketShare: () => fetchJson<import('@/types').BoroughMarketShare[]>('borough_market_share.json'),
  airportAnalysis:    () => fetchJson<import('@/types').AirportAnalysis[]>('airport_analysis.json'),
  speedCongestion:    () => fetchJson<import('@/types').SpeedCongestion[]>('speed_congestion.json'),
  paymentTipping:     () => fetchJson<import('@/types').PaymentTipping[]>('payment_tipping.json'),
  surchargesTaxes:    () => fetchJson<import('@/types').SurchargesTaxes[]>('surcharges_taxes.json'),
  transitEquity:      () => fetchJson<import('@/types').TransitEquity[]>('transit_equity.json'),
  multiYearTrends:    () => fetchJson<import('@/types').MultiYearTrends[]>('multi_year_trends.json'),
  executiveSimulation: () => fetchJson<import('@/types').ExecutiveSimulation[]>('executive_simulation.json'),
  neighborhoodGrowth: () => fetchJson<import('@/types').NeighborhoodGrowth[]>('neighborhood_growth.json'),
  weatherImpact:      () => fetchJson<import('@/types').WeatherImpact[]>('weather_impact.json'),
  weatherSurgeTrap:   () => fetchJson<import('@/types').WeatherSurgeTrap[]>('weather_surge_trap.json'),
  tippingWeatherSegments: () => fetchJson<import('@/types').TippingWeatherSegment[]>('tipping_weather_segments.json'),
  transitHubBottleneck: () => fetchJson<import('@/types').TransitHubBottleneck[]>('transit_hub_bottleneck.json'),
};

export const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const BOROUGH_COLORS: Record<string, string> = {
  'Manhattan':    '#1a56db',
  'Brooklyn':     '#0e9f6e',
  'Queens':       '#d97706',
  'Bronx':        '#7c3aed',
  'Staten Island':'#dc2626',
  'EWR':          '#6b7280',
  'Unknown':      '#9ca3af',
};

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
