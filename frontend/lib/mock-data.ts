import type {
  AiInsight,
  CityMetric,
  CityOverview,
  EnforcementCase,
  Facility,
  ForecastFrame,
  GridCell,
  PollutionSource,
  Station,
  Ward,
} from './types'

// ----------------------------------------------------------------------------
// Deterministic seeded PRNG so the dataset is stable across renders / SSR.
// ----------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Delhi geographic envelope
export const DELHI_CENTER: [number, number] = [28.6139, 77.209]
export const DELHI_BOUNDS = { minLat: 28.4, maxLat: 28.88, minLng: 76.84, maxLng: 77.36 }

// Pollution "hot cores" used to shape the field (Anand Vihar, industrial belts, etc.)
const HOT_CORES = [
  { lat: 28.6469, lng: 77.3155, strength: 1.0 }, // Anand Vihar
  { lat: 28.6692, lng: 77.1, strength: 0.8 }, // Wazirpur industrial
  { lat: 28.5355, lng: 77.241, strength: 0.55 }, // Okhla
  { lat: 28.7041, lng: 77.1025, strength: 0.7 }, // Rohini / Bawana corridor
  { lat: 28.5921, lng: 77.046, strength: 0.5 }, // Dwarka dust
]

function fieldAt(lat: number, lng: number, rnd: () => number, t = 0): number {
  let base = 150
  for (const core of HOT_CORES) {
    const d = Math.hypot((lat - core.lat) * 111, (lng - core.lng) * 97)
    base += core.strength * 230 * Math.exp(-(d * d) / 18)
  }
  // diurnal + forecast drift
  base += Math.sin((t / 24) * Math.PI * 2) * 35
  base += (rnd() - 0.5) * 40
  return Math.round(Math.max(30, Math.min(498, base)))
}

// ----------------------------------------------------------------------------
// GET /api/grid
// ----------------------------------------------------------------------------
export function generateGrid(rows = 26, cols = 26): GridCell[] {
  const rnd = mulberry32(42)
  const cells: GridCell[] = []
  const { minLat, maxLat, minLng, maxLng } = DELHI_BOUNDS
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = minLat + ((maxLat - minLat) * r) / (rows - 1)
      const lng = minLng + ((maxLng - minLng) * c) / (cols - 1)
      const aqi = fieldAt(lat, lng, rnd)
      cells.push({
        id: `g-${r}-${c}`,
        lat,
        lng,
        aqi,
        pm25: Math.round(aqi * 0.62),
        pm10: Math.round(aqi * 1.1),
        no2: Math.round(20 + rnd() * 70),
        residual: Math.round((rnd() - 0.5) * 80),
        confidence: 0.6 + rnd() * 0.38,
      })
    }
  }
  return cells
}

// ----------------------------------------------------------------------------
// GET /api/sources
// ----------------------------------------------------------------------------
const SOURCE_DEFS: Omit<PollutionSource, 'contribution' | 'confidence' | 'trend'>[] = [
  { id: 's1', name: 'Anand Vihar Transport Hub', type: 'traffic', lat: 28.6469, lng: 77.3155, ward: 'Anand Vihar' },
  { id: 's2', name: 'Wazirpur Industrial Area', type: 'industrial', lat: 28.6692, lng: 77.1631, ward: 'Wazirpur' },
  { id: 's3', name: 'Okhla Construction Zone', type: 'construction', lat: 28.5355, lng: 77.2710, ward: 'Okhla' },
  { id: 's4', name: 'Bawana Industrial Estate', type: 'industrial', lat: 28.7965, lng: 77.0460, ward: 'Bawana' },
  { id: 's5', name: 'NH-48 Dwarka Corridor', type: 'dust', lat: 28.5921, lng: 77.0460, ward: 'Dwarka' },
  { id: 's6', name: 'Mundka Biomass Belt', type: 'biomass', lat: 28.6822, lng: 77.0319, ward: 'Mundka' },
  { id: 's7', name: 'ITO Traffic Junction', type: 'traffic', lat: 28.6286, lng: 77.2410, ward: 'ITO' },
  { id: 's8', name: 'Narela Residential Cluster', type: 'residential', lat: 28.8395, lng: 77.0925, ward: 'Narela' },
]

export function generateSources(): PollutionSource[] {
  const rnd = mulberry32(7)
  const raw = SOURCE_DEFS.map((s) => ({ s, w: 0.4 + rnd() * 1.6 }))
  const total = raw.reduce((a, b) => a + b.w, 0)
  return raw.map(({ s, w }) => ({
    ...s,
    contribution: w / total,
    confidence: 0.62 + rnd() * 0.36,
    trend: Math.round((rnd() - 0.45) * 24),
  }))
}

// ----------------------------------------------------------------------------
// GET /api/stations
// ----------------------------------------------------------------------------
const STATION_DEFS = [
  ['Anand Vihar', 28.6469, 77.3155],
  ['R.K. Puram', 28.5635, 77.1855],
  ['Punjabi Bagh', 28.6688, 77.1311],
  ['Mandir Marg', 28.6362, 77.2007],
  ['IGI Airport T3', 28.5562, 77.0999],
  ['Dwarka Sector 8', 28.5710, 77.0719],
  ['Rohini', 28.7325, 77.1199],
  ['Najafgarh', 28.6090, 76.9854],
  ['Jahangirpuri', 28.7327, 77.1709],
  ['Sonia Vihar', 28.7105, 77.2495],
  ['Nehru Nagar', 28.5677, 77.2510],
  ['Wazirpur', 28.6992, 77.1654],
] as const

export function generateStations(): Station[] {
  const rnd = mulberry32(13)
  return STATION_DEFS.map(([name, lat, lng], i) => {
    const roll = rnd()
    const status: Station['status'] = roll > 0.9 ? 'offline' : roll > 0.78 ? 'degraded' : 'online'
    const aqi = fieldAt(lat as number, lng as number, rnd)
    return {
      id: `st-${i}`,
      name: name as string,
      lat: lat as number,
      lng: lng as number,
      aqi,
      pm25: Math.round(aqi * 0.6),
      status,
      updatedAgoMin: Math.round(rnd() * 18),
    }
  })
}

// ----------------------------------------------------------------------------
// GET /api/forecast — 72 hourly frames (downsampled grid for animation)
// ----------------------------------------------------------------------------
export function generateForecast(): ForecastFrame[] {
  const frames: ForecastFrame[] = []
  const rows = 14
  const cols = 14
  const { minLat, maxLat, minLng, maxLng } = DELHI_BOUNDS
  for (let h = 0; h <= 72; h += 3) {
    const rnd = mulberry32(100 + h)
    const cells: ForecastFrame['cells'] = []
    let sum = 0
    let peak = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lat = minLat + ((maxLat - minLat) * r) / (rows - 1)
        const lng = minLng + ((maxLng - minLng) * c) / (cols - 1)
        const aqi = fieldAt(lat, lng, rnd, h)
        cells.push({ id: `f-${h}-${r}-${c}`, lat, lng, aqi })
        sum += aqi
        peak = Math.max(peak, aqi)
      }
    }
    frames.push({
      hour: h,
      label: h === 0 ? 'Now' : `+${h}h`,
      cells,
      cityAvg: Math.round(sum / cells.length),
      peakAqi: peak,
    })
  }
  return frames
}

// ----------------------------------------------------------------------------
// Enforcement cases (drives /api/enforce workflow)
// ----------------------------------------------------------------------------
export function generateEnforcement(): EnforcementCase[] {
  const rnd = mulberry32(21)
  const sites = [
    ['Okhla Phase II Site B', 'Okhla', 'construction'],
    ['Wazirpur Rolling Mills', 'Wazirpur', 'industrial'],
    ['Bawana Plastic Units', 'Bawana', 'industrial'],
    ['Mundka Waste Burning', 'Mundka', 'biomass'],
    ['Anand Vihar Idling Bays', 'Anand Vihar', 'traffic'],
    ['Dwarka Expressway Earthworks', 'Dwarka', 'dust'],
    ['Narela DSIIDC Sheds', 'Narela', 'industrial'],
    ['Mayapuri Scrap Yards', 'Mayapuri', 'industrial'],
  ] as const
  const recs = [
    'Dispatch field unit within 2h — emission threshold exceeded.',
    'Issue stop-work notice; deploy anti-smog gun on site.',
    'Night patrol recommended; biomass ignition pattern detected.',
    'Verify dust-control compliance; sprinkler logs requested.',
    'Coordinate with traffic police to clear idling congestion.',
  ]
  const sev: EnforcementCase['priority'][] = ['critical', 'high', 'medium', 'low']
  return sites.map(([site, ward, type], i) => {
    const priority = sev[Math.min(3, Math.floor(rnd() * 3.4))]
    const impact = Math.round(20 + rnd() * 90)
    return {
      id: `ec-${i}`,
      site,
      ward,
      sourceType: type as EnforcementCase['sourceType'],
      priority,
      aqiImpact: impact,
      recommendation: recs[Math.floor(rnd() * recs.length)],
      confidence: 0.6 + rnd() * 0.38,
      violations: Math.floor(rnd() * 9),
      lastInspected: `${Math.floor(rnd() * 40) + 1}d ago`,
      status: (['queued', 'queued', 'dispatched', 'inspecting', 'resolved'] as const)[Math.floor(rnd() * 5)],
      roi: Math.round(impact * (1.5 + rnd() * 3)),
      lat: 28.5 + rnd() * 0.32,
      lng: 76.95 + rnd() * 0.36,
    }
  })
}

// ----------------------------------------------------------------------------
// Wards + facilities for citizen intelligence
// ----------------------------------------------------------------------------
export function generateWards(): Ward[] {
  const rnd = mulberry32(31)
  const defs: [string, number, number][] = [
    ['Anand Vihar', 28.6469, 77.3155],
    ['Shahdara', 28.6735, 77.2896],
    ['Rohini', 28.7325, 77.1199],
    ['Dwarka', 28.5921, 77.046],
    ['Najafgarh', 28.609, 76.9854],
    ['Karol Bagh', 28.6512, 77.1907],
    ['Saket', 28.5245, 77.206],
    ['Civil Lines', 28.6818, 77.2226],
    ['Mayur Vihar', 28.6092, 77.295],
    ['Janakpuri', 28.6219, 77.0878],
  ]
  return defs.map(([name, lat, lng], i) => {
    const aqi = fieldAt(lat, lng, rnd)
    const population = Math.round(180000 + rnd() * 520000)
    return {
      id: `w-${i}`,
      name,
      lat,
      lng,
      aqi,
      population,
      schools: Math.round(20 + rnd() * 80),
      hospitals: Math.round(2 + rnd() * 12),
      riskScore: Math.round((aqi / 500) * 70 + (population / 700000) * 30),
    }
  })
}

export function generateFacilities(): Facility[] {
  const rnd = mulberry32(57)
  const out: Facility[] = []
  const kinds: Facility['type'][] = ['school', 'hospital', 'construction']
  const names: Record<Facility['type'], string[]> = {
    school: ['DPS', 'Govt. Sr. Sec. School', 'Ryan Intl', "St. Mary's", 'Sarvodaya Vidyalaya'],
    hospital: ['AIIMS Annexe', 'Max Hospital', 'GTB Hospital', 'Fortis', 'LNJP'],
    construction: ['Metro Phase-IV Site', 'Flyover Works', 'Tower Project', 'Road Widening'],
  }
  for (let i = 0; i < 60; i++) {
    const type = kinds[Math.floor(rnd() * kinds.length)]
    const lat = 28.45 + rnd() * 0.4
    const lng = 76.9 + rnd() * 0.42
    const aqi = fieldAt(lat, lng, rnd)
    const exposure =
      aqi > 350 ? 'critical' : aqi > 280 ? 'high' : aqi > 180 ? 'medium' : 'low'
    out.push({
      id: `fac-${i}`,
      name: `${names[type][Math.floor(rnd() * names[type].length)]} ${i + 1}`,
      type,
      lat,
      lng,
      aqi,
      exposure,
    })
  }
  return out
}

// ----------------------------------------------------------------------------
// Multi-city metrics
// ----------------------------------------------------------------------------
export function generateCities(): CityMetric[] {
  const defs: [string, number, number, number, number][] = [
    ['Delhi', 28.6139, 77.209, 318, 19800000],
    ['Mumbai', 19.076, 72.8777, 164, 20700000],
    ['Bangalore', 12.9716, 77.5946, 96, 13200000],
    ['Chennai', 13.0827, 80.2707, 121, 11500000],
    ['Kolkata', 22.5726, 88.3639, 188, 14900000],
  ]
  return defs.map(([name, lat, lng, aqi, pop], i) => {
    const rnd = mulberry32(200 + i)
    const history = Array.from({ length: 14 }, (_, d) => ({
      day: `D-${14 - d}`,
      aqi: Math.round(aqi + Math.sin(d / 2) * 28 + (rnd() - 0.5) * 30),
    }))
    return {
      id: `city-${i}`,
      name,
      lat,
      lng,
      aqi,
      pm25: Math.round(aqi * 0.6),
      trend: Math.round((rnd() - 0.5) * 18),
      effectiveness: Math.round(40 + rnd() * 55),
      population: pop,
      history,
    }
  })
}

// ----------------------------------------------------------------------------
// AI insight feed
// ----------------------------------------------------------------------------
export function generateInsights(): AiInsight[] {
  const now = Date.now()
  const mk = (m: number) => new Date(now - m * 60000).toISOString()
  return [
    { id: 'ai-1', kind: 'attribution', severity: 'high', title: 'Anand Vihar dominant source', body: 'Anand Vihar transport hub contributes 38% of the current pollution burden across east Delhi wards.', confidence: 0.91, timestamp: mk(2) },
    { id: 'ai-2', kind: 'forecast', severity: 'critical', title: 'Severe threshold breach in 6h', body: 'AQI expected to exceed 250 within 6 hours across 4 central wards as wind speed drops to 4 km/h.', confidence: 0.84, timestamp: mk(8) },
    { id: 'ai-3', kind: 'enforcement', severity: 'high', title: 'Inspection recommended', body: 'PINN residual at Okhla Phase II is +62 — unmodeled emission detected. Field inspection recommended.', confidence: 0.88, timestamp: mk(14) },
    { id: 'ai-4', kind: 'health', severity: 'medium', title: 'School exposure advisory', body: '23 schools in poor-air wards. Recommend rescheduling outdoor activity between 08:00–11:00.', confidence: 0.79, timestamp: mk(26) },
    { id: 'ai-5', kind: 'anomaly', severity: 'critical', title: 'Biomass ignition anomaly', body: 'Sudden PM2.5 spike at Mundka inconsistent with traffic model — likely open biomass burning.', confidence: 0.86, timestamp: mk(41) },
    { id: 'ai-6', kind: 'forecast', severity: 'low', title: 'Western wards improving', body: 'Dwarka and Najafgarh trending down 12% over next 24h as a north-westerly front moves in.', confidence: 0.72, timestamp: mk(58) },
  ]
}

export function generateOverview(): CityOverview {
  const stations = generateStations()
  return {
    cityAqi: 318,
    cityAqiTrend: 6,
    dominantPollutant: 'PM2.5',
    stationsOnline: stations.filter((s) => s.status === 'online').length,
    stationsTotal: stations.length,
    activeHotspots: 5,
    forecastPeak: 372,
    forecastPeakHour: 6,
    enforcementOpen: generateEnforcement().filter((e) => e.status !== 'resolved').length,
  }
}
