'use client'

import { CommandSidebar } from '@/components/command/command-sidebar'
import { AiPanel } from '@/components/ai/ai-panel'
import { MapCanvas } from '@/components/map/map-canvas'
import { LayerControl } from '@/components/map/layer-control'
import { MapLegend } from '@/components/map/map-legend'
import { CellInspector } from '@/components/command/cell-inspector'
import { useGrid, useSources, useStations, useFacilities, useWards } from '@/lib/hooks'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function CommandCenterPage() {
  const grid = useGrid()
  const sources = useSources()
  const stations = useStations()
  const facilities = useFacilities()
  const wards = useWards()

  const isLoading = grid.isLoading || sources.isLoading || stations.isLoading
  const hasError = grid.isError || sources.isError || stations.isError
  const gridError = grid.error || sources.error || stations.error

  return (
    <div className="flex h-full">
      <CommandSidebar />

      <section className="relative min-w-0 flex-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading geospatial data…</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-6 max-w-md">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <p className="text-sm font-semibold text-red-700">Failed to load data</p>
              <p className="text-xs text-red-600/80">
                {gridError instanceof Error ? gridError.message : 'Backend API is not responding'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure backend is running: <code className="font-mono">cd backend && uvicorn app.main:app --reload</code>
              </p>
            </div>
          </div>
        )}

        <MapCanvas
          grid={grid.data}
          sources={sources.data}
          stations={stations.data}
          facilities={facilities.data}
          wards={wards.data}
        />

        {/* overlay controls */}
        <div className="pointer-events-none absolute left-4 top-4 z-[500]">
          <LayerControl />
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex items-end gap-3">
          <MapLegend />
          <CellInspector />
        </div>
      </section>

      <AiPanel />
    </div>
  )
}
