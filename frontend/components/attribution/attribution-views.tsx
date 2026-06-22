'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Scatter,
  ScatterChart,
  ZAxis,
  Cell,
} from 'recharts'
import { Panel, PanelHeader } from '@/components/aeris/primitives'
import { GitBranch, Activity, Layers, History } from 'lucide-react'
import type { PollutionSource } from '@/lib/types'
import { aqiColor } from '@/lib/aqi'
import { useSources } from '@/lib/hooks'

export function AttributionViews() {
  const { data: sources, isLoading } = useSources()
  if (isLoading || !sources) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Running inverse attribution model…
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <SourceFlow sources={sources} />
        <SourceCluster sources={sources} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SourceTimeline />
        <HistoricalComparison />
      </div>
    </div>
  )
}

const TYPE_COLOR: Record<string, string> = {
  traffic: '#e0913c',
  industrial: '#d65a32',
  construction: '#d8c43a',
  biomass: '#b53824',
  dust: '#c9a23a',
  residential: '#7fd4d2',
}

export function SourceFlow({ sources }: { sources: PollutionSource[] }) {
  const ranked = [...sources].sort((a, b) => b.contribution - a.contribution)
  return (
    <Panel>
      <PanelHeader title="Attribution Flow" icon={GitBranch} />
      <div className="p-4">
        <div className="flex flex-col gap-2.5">
          {ranked.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-xs text-foreground">{s.name}</div>
              <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-elevated/60">
                <div
                  className="flex h-full items-center justify-end rounded-md pr-2"
                  style={{
                    width: `${Math.max(8, s.contribution * 100 * 2.2)}%`,
                    backgroundColor: `${TYPE_COLOR[s.type]}cc`,
                  }}
                >
                  <span className="font-mono text-[10px] font-semibold text-background">
                    {(s.contribution * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                {Math.round(s.confidence * 100)}% c
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Contributions inferred from PINN inverse-attribution over the current AQI field. Bar width is normalized burden share.
        </p>
      </div>
    </Panel>
  )
}

export function SourceCluster({ sources }: { sources: PollutionSource[] }) {
  const data = sources.map((s) => ({
    x: s.lng,
    y: s.lat,
    z: s.contribution * 100,
    name: s.name,
    type: s.type,
  }))
  return (
    <Panel>
      <PanelHeader title="Source Clustering" icon={Layers} />
      <div className="h-72 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="lng" domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
            <YAxis type="number" dataKey="y" name="lat" domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
            <ZAxis type="number" dataKey="z" range={[60, 700]} />
            <RTooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
              contentStyle={tooltipStyle}
              formatter={(v: number, n: string) => [typeof v === 'number' ? v.toFixed(2) : v, n]}
            />
            <Scatter data={data}>
              {data.map((d, i) => (
                <Cell key={i} fill={TYPE_COLOR[d.type]} fillOpacity={0.65} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export function SourceTimeline() {
  const data = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    traffic: Math.round(80 + Math.sin((h - 8) / 3) * 50 + (h > 7 && h < 11 ? 60 : 0) + (h > 17 && h < 21 ? 50 : 0)),
    industrial: Math.round(60 + Math.cos(h / 4) * 25),
    biomass: Math.round(h > 18 || h < 6 ? 70 + Math.random() * 30 : 20),
  }))
  return (
    <Panel>
      <PanelHeader title="Temporal Attribution (24h)" icon={Activity} />
      <div className="h-64 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <defs>
              {['traffic', 'industrial', 'biomass'].map((k) => (
                <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TYPE_COLOR[k]} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={TYPE_COLOR[k]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="hour" interval={3} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
            <RTooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="traffic" stroke={TYPE_COLOR.traffic} fill="url(#g-traffic)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="industrial" stroke={TYPE_COLOR.industrial} fill="url(#g-industrial)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="biomass" stroke={TYPE_COLOR.biomass} fill="url(#g-biomass)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export function HistoricalComparison() {
  const data = Array.from({ length: 12 }, (_, m) => ({
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m],
    thisYear: Math.round(180 + Math.sin((m - 2) / 2) * 90 + (m > 9 || m < 1 ? 120 : 0)),
    lastYear: Math.round(190 + Math.sin((m - 2) / 2) * 95 + (m > 9 || m < 1 ? 140 : 0)),
  }))
  return (
    <Panel>
      <PanelHeader title="Historical Comparison" icon={History} />
      <div className="h-64 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
            <RTooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="lastYear" stroke="var(--muted-foreground)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" />
            <Area type="monotone" dataKey="thisYear" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 11,
  color: 'var(--popover-foreground)',
}

export { TYPE_COLOR, aqiColor }
