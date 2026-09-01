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

export interface MarketShare {
  mode: 'Yellow Taxi' | 'Uber' | 'Lyft';
  total_trips: number;
  total_revenue: number;
  trip_share_pct: number;
  revenue_share_pct: number;
  avg_fare: number;
  avg_trip_distance_miles: number;
  avg_duration_min: number;
  avg_driver_pay?: number;
  avg_tip_pct: number;
}

export interface BoroughMarketShare {
  borough: string;
  yellow_trips: number;
  uber_trips: number;
  lyft_trips: number;
  total_trips: number;
  yellow_share_pct: number;
  uber_share_pct: number;
  lyft_share_pct: number;
}

export interface AirportAnalysis {
  airport?: string;
  zone?: string;
  location_id?: number;
  borough?: string;
  is_airport_pickup?: number;
  is_airport_dropoff?: number;
  pickup_hour?: number;
  trip_count?: number;
  total_trips?: number;
  total_revenue?: number;
  avg_revenue?: number;
  avg_fare?: number;
  avg_tip?: number;
  avg_tip_rate_pct?: number;
  avg_distance_miles?: number;
  avg_duration_min?: number;
  avg_revenue_per_km?: number;
  peak_hour?: number;
  peak_day?: string;
}

export interface SpeedCongestion {
  borough: string;
  pickup_hour: number;
  trip_count: number;
  avg_speed_mph: number;
  avg_duration_min: number;
  avg_distance_miles: number;
}

export interface PaymentTipping {
  payment_type_id: number;
  payment_type_name?: string;
  trip_count: number;
  total_revenue: number;
  avg_fare: number;
  avg_tip: number;
  avg_tip_rate_pct: number;
  pct_trips_with_tip: number;
}

export interface SurchargesTaxes {
  pickup_month: number;
  total_trips: number;
  total_congestion_surcharge: number;
  total_airport_fee: number;
  total_mta_tax: number;
  total_tolls: number;
  total_revenue: number;
}

export interface TransitEquity {
  borough: string;
  total_trips: number;
  outer_borough_trip_share_pct: number;
  avg_fare: number;
  avg_distance_miles: number;
  avg_revenue_per_km: number;
  active_pickup_zones: number;
}

export interface MultiYearTrends {
  year: number;
  total_trips: number;
  total_revenue: number;
  avg_fare: number;
  avg_tip_pct: number;
  avg_distance_miles: number;
  midtown_8am_rush_trips: number;
}

export interface ExecutiveSimulation {
  borough: string;
  trip_count: number;
  current_revenue: number;
  avg_current_fare: number;
  avg_distance_miles: number;
  avg_duration_min: number;
  pct_congestion_zone_trips: number;
}

export interface NeighborhoodGrowth {
  location_id: number;
  zone: string;
  borough: string;
  trip_count_2023: number;
  revenue_2023: number;
  avg_fare_2023: number;
  avg_distance_miles: number;
  growth_rate_pct?: number;
}

export interface WeatherImpact {
  weather_condition: string;
  total_trips: number;
  total_revenue: number;
  avg_fare: number;
  avg_tip_pct: number;
  avg_distance_miles: number;
  avg_duration_min: number;
}

export interface WeatherSurgeTrap {
  corridor_name: string;
  weather_condition: string;
  trip_count: number;
  avg_gross_fare: number;
  avg_duration_min: number;
  avg_distance_miles: number;
  est_deadhead_min: number;
  effective_hourly_revenue: number;
  avg_revenue_per_km: number;
  avg_tip_pct: number;
  recommendation?: string;
}

export interface TippingWeatherSegment {
  customer_segment: string;
  time_window: string;
  weather_condition: string;
  trip_count: number;
  avg_fare: number;
  avg_tip_amount: number;
  avg_tip_pct: number;
  pct_trips_with_tip: number;
  sensitivity_label?: string;
  suggested_smart_tip_pct?: number;
}

export interface TransitHubBottleneck {
  hub_name: string;
  weather_condition: string;
  trip_count_rush_hour: number;
  demand_spike_multiplier: number;
  avg_speed_mph: number;
  avg_duration_min: number;
  nearby_supply_lag_min: number;
  unmet_demand_estimate_pct: number;
  dispatch_action?: string;
}







