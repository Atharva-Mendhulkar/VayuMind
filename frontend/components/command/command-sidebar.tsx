'use client'

import { motion } from 'motion/react'
import { Flame, Gauge, ShieldAlert, TrendingUp, ChevronRight } from 'lucide-react'
import { Panel, PanelHeader, AqiBadge, Metric, Dot } from '@/components/aeris/primitives'
import { bandFor, severityColor } from '@/lib/aqi'
import { useEnforcement, useOverview, useSources, useForecast } from '@/lib/hooks'

export function CommandSidebar() {
  const { data: overview } = useOverview()
  const { data: sources } = useSources()
  const { data: forecast } = useForecast()
  const { data: enforcement } = useEnforcement()

  const band = overview ? bandFor(overview.cityAqi) : null
  const hotspots = (sources ?? [])
    .slice()
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 4)
  const queue = (enforcement ?? [])
    .filter((e) => e.status !== 'resolved')
    .slice(0, 3)

  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto scroll-thin border-r border-border bg-sidebar/60 p-3">
      {/* Current AQI */}
      <Panel>
        <PanelHeader title="Current AQI" icon={Gauge} />
        <div className="p-3">
          {overview && band ? (
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono text-4xl font-semibold tabular-nums"
                    style={{ color: band.hex }}
                  >
                    {overview.cityAqi}
                  </span>
                  <span
                    className="text-xs font-medium tabular-nums"
                    style={{ color: overview.cityAqiTrend > 0 ? 'var(--aqi-unhealthy)' : 'var(--aqi-good)' }}
                  >
                    {overview.cityAqiTrend > 0 ? '+' : ''}
                    {overview.cityAqiTrend}%
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium" style={{ color: band.hex }}>
                  {band.label}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {band.text}
                </p>
              </div>
            </div>
          ) : (
            <Skeleton />
          )}
          {overview ? (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
              <Metric label="Dominant" value={overview.dominantPollutant} />
              <Metric label="Hotspots" value={overview.activeHotspots} />
            </div>
          ) : null}
        </div>
      </Panel>

      {/* Active Hotspots */}
      <Panel>
        <PanelHeader title="Active Hotspots" icon={Flame} />
        <div className="flex flex-col">
          {hotspots.map((h, i) => (
            <motion.button
              key={h.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left transition-colors last:border-0 hover:bg-elevated/50"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">{h.name}</div>
                <div className="text-[10px] capitalize text-muted-foreground">{h.type}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {(h.contribution * 100).toFixed(0)}%
                </span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </div>
            </motion.button>
          ))}
        </div>
      </Panel>

      {/* Forecast Summary */}
      <Panel>
        <PanelHeader title="Forecast Summary" icon={TrendingUp} />
        <div className="p-3">
          {overview && forecast ? (
            <>
              <div className="flex items-center justify-between">
                <Metric
                  label={`Peak +${overview.forecastPeakHour}h`}
                  value={overview.forecastPeak}
                />
                <AqiBadge aqi={overview.forecastPeak} size="md" />
              </div>
              <div className="mt-3 flex items-end gap-1">
                {forecast.slice(0, 12).map((f) => (
                  <div key={f.hour} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${Math.max(6, (f.cityAvg / 420) * 44)}px`,
                        backgroundColor: bandFor(f.cityAvg).hex,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>Now</span>
                <span>+36h</span>
              </div>
            </>
          ) : (
            <Skeleton />
          )}
        </div>
      </Panel>

      {/* Enforcement Queue */}
      <Panel>
        <PanelHeader
          title="Enforcement Queue"
          icon={ShieldAlert}
          action={
            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-foreground">
              {overview?.enforcementOpen ?? '—'}
            </span>
          }
        />
        <div className="flex flex-col">
          {queue.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-0"
            >
              <Dot color={severityColor(c.priority)} pulse={c.priority === 'critical'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-foreground">{c.site}</div>
                <div className="text-[10px] text-muted-foreground">
                  {c.ward} · {c.priority}
                </div>
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                +{c.aqiImpact}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  )
}

function Skeleton() {
  return <div className="h-16 animate-pulse rounded bg-elevated/60" />
}
