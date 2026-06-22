'use client'

import { create } from 'zustand'
import type { GridCell } from '@/lib/types'

export type LayerId =
  | 'aqi'
  | 'sources'
  | 'forecast'
  | 'residual'
  | 'traffic'
  | 'meteorological'
  | 'population'
  | 'school'
  | 'hospital'
  | 'construction'
  | 'risk'

export interface LayerDef {
  id: LayerId
  label: string
  group: 'Atmosphere' | 'Model' | 'Infrastructure' | 'Risk'
  description: string
}

export const LAYERS: LayerDef[] = [
  { id: 'aqi', label: 'AQI Heatmap', group: 'Atmosphere', description: 'Interpolated CPCB AQI field' },
  { id: 'forecast', label: 'AQI Forecast', group: 'Atmosphere', description: 'PINN-projected AQI surface' },
  { id: 'meteorological', label: 'Meteorological', group: 'Atmosphere', description: 'Wind vectors & boundary layer' },
  { id: 'sources', label: 'Source Attribution', group: 'Model', description: 'Emission source contributions' },
  { id: 'residual', label: 'PINN Residual', group: 'Model', description: 'Observed − predicted anomaly' },
  { id: 'traffic', label: 'Traffic Density', group: 'Model', description: 'Vehicular flow intensity' },
  { id: 'construction', label: 'Construction', group: 'Infrastructure', description: 'Active construction sites' },
  { id: 'population', label: 'Population', group: 'Infrastructure', description: 'Population density grid' },
  { id: 'school', label: 'Schools', group: 'Infrastructure', description: 'School exposure points' },
  { id: 'hospital', label: 'Hospitals', group: 'Infrastructure', description: 'Hospital exposure points' },
  { id: 'risk', label: 'Risk Surface', group: 'Risk', description: 'Composite citizen risk index' },
]

interface MapState {
  activeLayers: Record<LayerId, boolean>
  basemap: 'dark' | 'satellite'
  selectedCell: GridCell | null
  opacity: number
  toggleLayer: (id: LayerId) => void
  setBasemap: (b: 'dark' | 'satellite') => void
  selectCell: (c: GridCell | null) => void
  setOpacity: (o: number) => void
}

export const useMapStore = create<MapState>((set) => ({
  activeLayers: {
    aqi: true,
    sources: true,
    forecast: false,
    residual: false,
    traffic: false,
    meteorological: false,
    population: false,
    school: false,
    hospital: false,
    construction: false,
    risk: false,
  },
  basemap: 'dark',
  selectedCell: null,
  opacity: 0.7,
  toggleLayer: (id) =>
    set((s) => ({ activeLayers: { ...s.activeLayers, [id]: !s.activeLayers[id] } })),
  setBasemap: (basemap) => set({ basemap }),
  selectCell: (selectedCell) => set({ selectedCell }),
  setOpacity: (opacity) => set({ opacity }),
}))
