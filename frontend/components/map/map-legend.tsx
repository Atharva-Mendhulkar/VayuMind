'use client'

import { AQI_BANDS } from '@/lib/aqi'
import { Panel } from '@/components/aeris/primitives'

export function MapLegend() {
  return (
    <Panel className="pointer-events-auto px-3 py-2.5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        AQI Scale (CPCB)
      </div>
      <div className="flex items-center gap-0">
        {AQI_BANDS.map((b) => (
          <div key={b.key} className="flex flex-col items-center gap-1">
            <span
              className="h-2.5 w-10 first:rounded-l-sm last:rounded-r-sm"
              style={{ backgroundColor: b.hex }}
            />
            <span className="font-mono text-[9px] text-muted-foreground">{b.min}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
