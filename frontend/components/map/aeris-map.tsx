'use client'

import { CircleMarker, MapContainer, Polyline, Rectangle, TileLayer, Tooltip as LTooltip, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { GridCell, PollutionSource, Station, Facility, Ward } from '@/lib/types'
import { aqiRamp, aqiColor, severityColor } from '@/lib/aqi'
import { DELHI_BOUNDS, DELHI_CENTER } from '@/lib/mock-data'
import { useMapStore, type LayerId } from '@/stores/use-map-store'

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

interface AerisMapProps {
  grid?: GridCell[]
  forecastCells?: { id: string; lat: number; lng: number; aqi: number }[]
  sources?: PollutionSource[]
  stations?: Station[]
  facilities?: Facility[]
  wards?: Ward[]
  /** override which layers render, otherwise use store */
  layerOverride?: Partial<Record<LayerId, boolean>>
  className?: string
  zoom?: number
  interactiveCells?: boolean
}

function cellSize() {
  const latStep = (DELHI_BOUNDS.maxLat - DELHI_BOUNDS.minLat) / 26
  const lngStep = (DELHI_BOUNDS.maxLng - DELHI_BOUNDS.minLng) / 26
  return { latStep, lngStep }
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [map])
  return null
}

export default function AerisMap({
  grid = [],
  forecastCells = [],
  sources = [],
  stations = [],
  facilities = [],
  wards = [],
  layerOverride,
  className,
  zoom = 11,
  interactiveCells = true,
}: AerisMapProps) {
  const store = useMapStore()
  const active = (id: LayerId) =>
    layerOverride ? Boolean(layerOverride[id]) : store.activeLayers[id]
  const opacity = store.opacity
  const { latStep, lngStep } = cellSize()

  return (
    <MapContainer
      center={DELHI_CENTER}
      zoom={zoom}
      minZoom={9}
      maxZoom={15}
      zoomControl={false}
      attributionControl
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <MapResizer />
      <TileLayer
        url={store.basemap === 'satellite' ? SAT_TILES : DARK_TILES}
        className="aeris-tiles"
        attribution='&copy; OpenStreetMap, CARTO'
      />

      {/* AQI heatmap field */}
      {active('aqi') &&
        grid.map((c) => (
          <Rectangle
            key={c.id}
            bounds={[
              [c.lat - latStep / 2, c.lng - lngStep / 2],
              [c.lat + latStep / 2, c.lng + lngStep / 2],
            ]}
            pathOptions={{
              fillColor: aqiRamp(c.aqi),
              fillOpacity: opacity,
              stroke: false,
            }}
            eventHandlers={
              interactiveCells
                ? { click: () => store.selectCell(c) }
                : undefined
            }
          />
        ))}

      {/* Forecast surface */}
      {active('forecast') &&
        forecastCells.map((c) => {
          const fLat = (DELHI_BOUNDS.maxLat - DELHI_BOUNDS.minLat) / 14
          const fLng = (DELHI_BOUNDS.maxLng - DELHI_BOUNDS.minLng) / 14
          return (
            <Rectangle
              key={c.id}
              bounds={[
                [c.lat - fLat / 2, c.lng - fLng / 2],
                [c.lat + fLat / 2, c.lng + fLng / 2],
              ]}
              pathOptions={{ fillColor: aqiRamp(c.aqi), fillOpacity: opacity, stroke: false }}
            />
          )
        })}

      {/* PINN residual anomaly layer */}
      {active('residual') &&
        grid
          .filter((c) => Math.abs(c.residual) > 30)
          .map((c) => (
            <CircleMarker
              key={`r-${c.id}`}
              center={[c.lat, c.lng]}
              radius={Math.min(14, Math.abs(c.residual) / 6)}
              pathOptions={{
                color: c.residual > 0 ? '#d65a32' : '#33b07a',
                fillColor: c.residual > 0 ? '#d65a32' : '#33b07a',
                fillOpacity: 0.35,
                weight: 1,
              }}
            >
              <LTooltip>{`Residual ${c.residual > 0 ? '+' : ''}${c.residual}`}</LTooltip>
            </CircleMarker>
          ))}

      {/* Population proxy (grid intensity) */}
      {active('population') &&
        grid
          .filter((_, i) => i % 2 === 0)
          .map((c) => (
            <CircleMarker
              key={`p-${c.id}`}
              center={[c.lat, c.lng]}
              radius={6}
              pathOptions={{ color: '#5b8def', fillColor: '#5b8def', fillOpacity: 0.18, weight: 0 }}
            />
          ))}

      {/* Traffic density lines (synthetic corridors from sources) */}
      {active('traffic') &&
        sources
          .filter((s) => s.type === 'traffic')
          .map((s) => (
            <Polyline
              key={`t-${s.id}`}
              positions={[
                [s.lat - 0.04, s.lng - 0.05],
                [s.lat, s.lng],
                [s.lat + 0.05, s.lng + 0.04],
              ]}
              pathOptions={{ color: '#e0913c', weight: 3, opacity: 0.6, dashArray: '6 6' }}
            />
          ))}

      {/* Meteorological wind vectors */}
      {active('meteorological') &&
        grid
          .filter((_, i) => i % 24 === 0)
          .map((c) => (
            <Polyline
              key={`w-${c.id}`}
              positions={[
                [c.lat, c.lng],
                [c.lat + 0.02, c.lng + 0.03],
              ]}
              pathOptions={{ color: '#7fd4d2', weight: 1.5, opacity: 0.7 }}
            />
          ))}

      {/* Source attribution markers */}
      {active('sources') &&
        sources.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={8 + s.contribution * 40}
            pathOptions={{
              color: '#f0c14b',
              fillColor: '#f0c14b',
              fillOpacity: 0.25,
              weight: 1.5,
            }}
          >
            <LTooltip>{`${s.name} — ${(s.contribution * 100).toFixed(0)}%`}</LTooltip>
          </CircleMarker>
        ))}

      {/* Construction sites */}
      {active('construction') &&
        facilities
          .filter((f) => f.type === 'construction')
          .map((f) => (
            <CircleMarker
              key={f.id}
              center={[f.lat, f.lng]}
              radius={5}
              pathOptions={{ color: '#e0913c', fillColor: '#e0913c', fillOpacity: 0.7, weight: 1 }}
            >
              <LTooltip>{f.name}</LTooltip>
            </CircleMarker>
          ))}

      {/* Schools */}
      {active('school') &&
        facilities
          .filter((f) => f.type === 'school')
          .map((f) => (
            <CircleMarker
              key={f.id}
              center={[f.lat, f.lng]}
              radius={5}
              pathOptions={{ color: severityColor(f.exposure), fillColor: severityColor(f.exposure), fillOpacity: 0.8, weight: 1 }}
            >
              <LTooltip>{`${f.name} — ${f.exposure}`}</LTooltip>
            </CircleMarker>
          ))}

      {/* Hospitals */}
      {active('hospital') &&
        facilities
          .filter((f) => f.type === 'hospital')
          .map((f) => (
            <CircleMarker
              key={f.id}
              center={[f.lat, f.lng]}
              radius={5}
              pathOptions={{ color: '#7fd4d2', fillColor: '#7fd4d2', fillOpacity: 0.8, weight: 1 }}
            >
              <LTooltip>{f.name}</LTooltip>
            </CircleMarker>
          ))}

      {/* Risk surface (ward bubbles) */}
      {active('risk') &&
        wards.map((w) => (
          <CircleMarker
            key={w.id}
            center={[w.lat, w.lng]}
            radius={10 + (w.riskScore / 100) * 26}
            pathOptions={{
              color: aqiColor(w.aqi),
              fillColor: aqiColor(w.aqi),
              fillOpacity: 0.22,
              weight: 1.5,
            }}
          >
            <LTooltip>{`${w.name} — risk ${w.riskScore}`}</LTooltip>
          </CircleMarker>
        ))}

      {/* Monitoring stations (always rendered as reference) */}
      {stations.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={4}
          pathOptions={{
            color: '#ffffff',
            fillColor: aqiColor(s.aqi),
            fillOpacity: 1,
            weight: 1.5,
          }}
        >
          <LTooltip>{`${s.name} — AQI ${s.aqi}`}</LTooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
