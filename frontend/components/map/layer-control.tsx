'use client'

import { Layers, Satellite, Map as MapIcon, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Panel } from '@/components/aeris/primitives'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { LAYERS, useMapStore, type LayerDef } from '@/stores/use-map-store'

const GROUPS = ['Atmosphere', 'Model', 'Infrastructure', 'Risk'] as const

export function LayerControl() {
  const { activeLayers, toggleLayer, basemap, setBasemap, opacity, setOpacity } =
    useMapStore()
  const [open, setOpen] = useState(true)

  const grouped = GROUPS.map((g) => ({
    group: g,
    items: LAYERS.filter((l) => l.group === g),
  }))

  return (
    <Panel className="pointer-events-auto w-60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <Layers className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Map Layers
          </span>
        </span>
        {open ? <Minus className="size-3.5 text-muted-foreground" /> : <Plus className="size-3.5 text-muted-foreground" />}
      </button>

      {open ? (
        <div className="max-h-[52vh] overflow-y-auto scroll-thin px-3 py-2.5">
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            <BasemapBtn
              active={basemap === 'dark'}
              onClick={() => setBasemap('dark')}
              icon={<MapIcon className="size-3.5" />}
              label="Dark"
            />
            <BasemapBtn
              active={basemap === 'satellite'}
              onClick={() => setBasemap('satellite')}
              icon={<Satellite className="size-3.5" />}
              label="Satellite"
            />
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Layer Opacity
              </span>
              <span className="font-mono text-[10px] text-foreground">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[opacity * 100]}
              min={20}
              max={100}
              onValueChange={(v) => setOpacity((Array.isArray(v) ? v[0] : v) / 100)}
            />
          </div>

          <div className="flex flex-col gap-3">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  {group}
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((layer) => (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      checked={activeLayers[layer.id]}
                      onToggle={() => toggleLayer(layer.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  )
}

function BasemapBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-background/40 text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function LayerRow({
  layer,
  checked,
  onToggle,
}: {
  layer: LayerDef
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-elevated/60">
      <span className="flex flex-col">
        <span className={cn('text-xs', checked ? 'text-foreground' : 'text-muted-foreground')}>
          {layer.label}
        </span>
      </span>
      <Switch size="sm" checked={checked} onCheckedChange={onToggle} />
    </label>
  )
}
