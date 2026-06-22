'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { Panel, AqiBadge, Metric } from '@/components/aeris/primitives'
import { useMapStore } from '@/stores/use-map-store'
import { bandFor } from '@/lib/aqi'

export function CellInspector() {
  const { selectedCell, selectCell } = useMapStore()

  return (
    <AnimatePresence>
      {selectedCell ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-auto w-64"
        >
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Grid Cell
              </span>
              <button
                type="button"
                onClick={() => selectCell(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close inspector"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <AqiBadge aqi={selectedCell.aqi} size="lg" />
                <span className="text-xs font-medium" style={{ color: bandFor(selectedCell.aqi).hex }}>
                  {bandFor(selectedCell.aqi).label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="PM2.5" value={selectedCell.pm25} unit="µg" />
                <Metric label="PM10" value={selectedCell.pm10} unit="µg" />
                <Metric label="NO₂" value={selectedCell.no2} unit="ppb" />
                <Metric label="Residual" value={`${selectedCell.residual > 0 ? '+' : ''}${selectedCell.residual}`} />
              </div>
              <div className="mt-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
                Model confidence {Math.round(selectedCell.confidence * 100)}% ·{' '}
                {selectedCell.lat.toFixed(3)}, {selectedCell.lng.toFixed(3)}
              </div>
            </div>
          </Panel>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
