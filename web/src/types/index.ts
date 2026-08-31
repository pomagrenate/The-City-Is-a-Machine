// src/types/index.ts
export interface ZoneRevenue {
  location_id: number;
  zone: string;
  borough: string;
  total_trips: number;
  total_revenue: number;
  avg_revenue_per_trip: number;
  avg_fare: number;
  avg_tip: number;
  avg_tip_rate_pct: number;
  avg_revenue_per_km: number;
  avg_revenue_per_min: number;
  avg_trip_distance_miles: number;
  avg_trip_duration_min: number;
}

export interface HourlyDemand {
  location_id: number;
  zone: string;
  borough: string;
  pickup_hour: number;
  pickup_dayofweek: number;
  day_name: string;
  trip_count: number;
  total_revenue: number;
  avg_revenue: number;
  avg_duration_min: number;
}

export interface BoroughSummary {
  borough: string;
  total_trips: number;
  total_revenue: number;
  avg_revenue_per_trip: number;
  avg_revenue_per_km: number;
  avg_distance_miles: number;
  avg_duration_min: number;
  avg_tip_rate_pct: number;
  pct_peak_trips: number;
  zone_count: number;
}

export interface MonthlyTrend {
  pickup_month: number;
  total_trips: number;
  total_revenue: number;
  avg_revenue_per_trip: number;
  avg_revenue_per_km: number;
  avg_duration_min: number;
  avg_tip_rate_pct: number;
  pct_airport_trips: number;
  pct_weekend_trips: number;
}

export interface UnitEconomics {
  trip_category: 'short' | 'medium' | 'long';
  trip_count: number;
  avg_distance_miles: number;
  avg_duration_min: number;
  avg_revenue: number;
  avg_revenue_per_km: number;
  avg_revenue_per_min: number;
  avg_tip_rate_pct: number;
  total_revenue: number;
  revenue_share_pct: number;
}

export interface DailyHeatmap {
  pickup_hour: number;
  pickup_dayofweek: number;
  day_name: string;
  trip_count: number;
  total_revenue: number;
  avg_revenue: number;
  avg_duration_min: number;
  active_zones: number;
}

export interface SimulatorBase {
  location_id: number;
  zone: string;
  borough: string;
  pickup_hour: number;
  pickup_dayofweek: number;
  day_name: string;
  historical_trips: number;
  historical_revenue: number;
  avg_revenue_per_trip: number;
  avg_duration_min: number;
  demand_share: number;
}

export interface BenchmarkTier {
  tier: string;
  size_gb: number;
  engines: {
    pandas?: BenchmarkEngine;
    duckdb?: BenchmarkEngine;
    spark?: BenchmarkEngine;
  };
}

export interface BenchmarkEngine {
  elapsed_sec?: number;
  peak_memory_mb?: number;
  notes?: string;
  status?: string;
  error?: string;
}

export interface BenchmarkResults {
  query: string;
  analysis: {
    finding: string;
    crossover_estimate: string;
    recommendation: string;
  };
  tiers: BenchmarkTier[];
}

export interface DataSummary {
  total_rows_processed: number;
  silver_files: number;
  tables_generated: string[];
}

export interface TopRoute {
  pu_location_id: number;
  do_location_id: number;
  pu_zone: string;
  do_zone: string;
  pu_borough: string;
  do_borough: string;
  trip_count: number;
  total_revenue: number;
  avg_revenue: number;
  avg_distance_miles: number;
  avg_duration_min: number;
}
