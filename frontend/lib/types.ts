export type LatLng = [number, number]

export interface GridCell {
  id: string
  lat: number
  lng: number
  aqi: number
  pm25: number
  pm10: number
  no2: number
  /** PINN model residual (observed - predicted) */
  residual: number
  /** model attribution confidence 0-1 */
  confidence: number
}

export type SourceType =
  | 'traffic'
  | 'construction'
  | 'industrial'
  | 'biomass'
  | 'dust'
  | 'residential'

export interface PollutionSource {
  id: string
  name: string
  type: SourceType
  lat: number
  lng: number
  /** share of total burden 0-1 */
  contribution: number
  confidence: number
  trend: number
  ward: string
}

export interface Station {
  id: string
  name: string
  lat: number
  lng: number
  aqi: number
  pm25: number
  status: 'online' | 'degraded' | 'offline'
  updatedAgoMin: number
}

export interface ForecastFrame {
  /** hours from now */
  hour: number
  label: string
  cells: { id: string; lat: number; lng: number; aqi: number }[]
  cityAvg: number
  peakAqi: number
}

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface EnforcementCase {
  id: string
  site: string
  ward: string
  sourceType: SourceType
  priority: Severity
  aqiImpact: number
  recommendation: string
  confidence: number
  violations: number
  lastInspected: string
  status: 'queued' | 'dispatched' | 'inspecting' | 'resolved'
  roi: number
  lat: number
  lng: number
}

export interface Ward {
  id: string
  name: string
  aqi: number
  population: number
  schools: number
  hospitals: number
  riskScore: number
  lat: number
  lng: number
}

export interface Facility {
  id: string
  name: string
  type: 'school' | 'hospital' | 'construction'
  lat: number
  lng: number
  aqi: number
  exposure: Severity
}

export interface CityMetric {
  id: string
  name: string
  aqi: number
  pm25: number
  trend: number
  /** intervention effectiveness 0-100 */
  effectiveness: number
  population: number
  lat: number
  lng: number
  history: { day: string; aqi: number }[]
}

export interface AiInsight {
  id: string
  kind: 'attribution' | 'forecast' | 'enforcement' | 'health' | 'anomaly'
  severity: Severity
  title: string
  body: string
  confidence: number
  timestamp: string
}

export interface CityOverview {
  cityAqi: number
  cityAqiTrend: number
  dominantPollutant: string
  stationsOnline: number
  stationsTotal: number
  activeHotspots: number
  forecastPeak: number
  forecastPeakHour: number
  enforcementOpen: number
}
