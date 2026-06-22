export interface AqiBand {
  key: string
  label: string
  min: number
  max: number
  /** css variable token */
  token: string
  /** raw hex for canvas / leaflet rendering */
  hex: string
  text: string
}

// Indian CPCB-style AQI bands, mapped to AERIS semantic tokens.
export const AQI_BANDS: AqiBand[] = [
  { key: 'good', label: 'Good', min: 0, max: 50, token: 'var(--aqi-good)', hex: '#33b07a', text: 'Air quality is healthy.' },
  { key: 'moderate', label: 'Satisfactory', min: 51, max: 100, token: 'var(--aqi-moderate)', hex: '#d8c43a', text: 'Minor discomfort to sensitive groups.' },
  { key: 'poor', label: 'Moderate', min: 101, max: 200, token: 'var(--aqi-poor)', hex: '#e0913c', text: 'Breathing discomfort likely.' },
  { key: 'unhealthy', label: 'Poor', min: 201, max: 300, token: 'var(--aqi-unhealthy)', hex: '#d65a32', text: 'Breathing discomfort on prolonged exposure.' },
  { key: 'severe', label: 'Very Poor', min: 301, max: 400, token: 'var(--aqi-severe)', hex: '#b53824', text: 'Respiratory illness on prolonged exposure.' },
  { key: 'hazardous', label: 'Severe', min: 401, max: 500, token: 'var(--aqi-hazardous)', hex: '#8a2417', text: 'Health emergency. Avoid all exposure.' },
]

export function bandFor(aqi: number): AqiBand {
  const b = AQI_BANDS.find((x) => aqi >= x.min && aqi <= x.max)
  return b ?? AQI_BANDS[AQI_BANDS.length - 1]
}

export function aqiColor(aqi: number): string {
  return bandFor(aqi).hex
}

export function aqiToken(aqi: number): string {
  return bandFor(aqi).token
}

export function aqiCategory(aqi: number): string {
  return bandFor(aqi).label
}

/** Continuous color ramp for smooth heatmaps (interpolates between band hexes). */
export function aqiRamp(aqi: number): string {
  const stops = AQI_BANDS.map((b) => ({ at: (b.min + b.max) / 2, hex: b.hex }))
  const v = Math.max(0, Math.min(500, aqi))
  if (v <= stops[0].at) return stops[0].hex
  if (v >= stops[stops.length - 1].at) return stops[stops.length - 1].hex
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (v >= a.at && v <= b.at) {
      const t = (v - a.at) / (b.at - a.at)
      return mix(a.hex, b.hex, t)
    }
  }
  return stops[stops.length - 1].hex
}

function mix(h1: string, h2: string, t: number): string {
  const c1 = hexToRgb(h1)
  const c2 = hexToRgb(h2)
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t)
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t)
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function severityColor(sev: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (sev) {
    case 'critical': return 'var(--aqi-severe)'
    case 'high': return 'var(--aqi-unhealthy)'
    case 'medium': return 'var(--aqi-poor)'
    case 'low': return 'var(--aqi-good)'
  }
}
