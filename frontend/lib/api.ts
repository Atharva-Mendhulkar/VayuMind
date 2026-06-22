const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  console.log(`[API] Fetching: ${url}`)
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API Error] ${response.status} ${response.statusText}:`, errorText)
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`[API] ✓ ${endpoint}`, data)
    return data
  } catch (error) {
    console.error(`[API] ✗ ${endpoint}:`, error)
    throw error
  }
}

export const api = {
  // Command Center
  grid: () => fetchAPI('/api/command/grid'),
  stations: () => fetchAPI('/api/command/stations'),
  overview: () => fetchAPI('/api/command/dashboard'),
  
  // Attribution
  sources: () => fetchAPI('/api/attribution/hotspots'),
  
  // Forecast
  forecast: () => fetchAPI('/api/forecast/grid/72'),
  
  // Enforcement
  enforcement: () => fetchAPI('/api/enforcement/queue'),
  enforce: (caseId: string) => 
    fetchAPI(`/api/enforcement/dispatch/${caseId}`, { method: 'POST' }),
  
  // Citizen
  wards: () => fetchAPI('/api/citizen/ward-risk'),
  facilities: () => fetchAPI('/api/citizen/facilities'),
  
  // Stubs for unused functions (kept for compatibility)
  cities: async () => [],
  insights: async () => [],
  generateForecast: (hours: number = 24, emissionCut: number = 0, windBoost: number = 0) =>
    fetchAPI('/api/forecast/run', {
      method: 'POST',
      body: JSON.stringify({ hours, emission_cut: emissionCut, wind_boost: windBoost }),
    }),
}
