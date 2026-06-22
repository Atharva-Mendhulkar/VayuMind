"use client"

import { useMemo, useState } from "react"
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts"
import { useForecast } from "@/lib/hooks"
import { Panel, AqiBadge } from "@/components/aeris/primitives"
import { aqiColor, aqiCategory } from "@/lib/aqi"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const HORIZONS = [24, 48, 72] as const

export function ForecastViews() {
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(72)
  const [emissionCut, setEmissionCut] = useState(0)
  const [windBoost, setWindBoost] = useState(0)
  const { data: frames, isLoading } = useForecast()

  const chartData = useMemo(() => {
    if (!frames) return []
    const factor = (1 - emissionCut / 100) * (1 - windBoost / 200)
    return frames
      .filter((f) => f.hour <= horizon)
      .map((f) => {
        // 90% band widens with horizon (forecast uncertainty grows)
        const spread = 0.06 + (f.hour / 72) * 0.22
        const scenario = Math.round(f.cityAvg * factor)
        return {
          time: f.label,
          forecast: f.cityAvg,
          scenario,
          low: Math.round(scenario * (1 - spread)),
          range: Math.round(scenario * 2 * spread),
        }
      })
  }, [frames, horizon, emissionCut, windBoost])

  const peak = useMemo(() => {
    if (!chartData.length) return null
    return chartData.reduce((a, b) => (b.scenario > a.scenario ? b : a))
  }, [chartData])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Horizon</span>
        {HORIZONS.map((h) => (
          <button
            key={h}
            onClick={() => setHorizon(h)}
            className={cn(
              "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
              horizon === h
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {h}h
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" /> Model: GNN-LSTM ensemble · RMSE 18.4 µg/m³
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">City-average PM2.5 forecast · 90% confidence interval</h3>
            {peak && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Peak <AqiBadge value={peak.scenario} /> at {peak.time}
              </div>
            )}
          </div>
          <div className="h-[320px] w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading forecast…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ left: -16, right: 8, top: 8 }} stackOffset="none">
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} width={40} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  {/* invisible base + visible range = floating confidence band */}
                  <Area dataKey="low" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
                  <Area dataKey="range" stackId="band" stroke="none" fill="var(--color-primary)" fillOpacity={0.14} isAnimationActive={false} />
                  <Line dataKey="forecast" stroke="var(--color-muted-foreground)" strokeDasharray="4 3" dot={false} strokeWidth={1.5} type="monotone" name="baseline" />
                  <Line dataKey="scenario" stroke="var(--color-primary)" dot={false} strokeWidth={2.5} type="monotone" name="scenario" />
                  {peak && <ReferenceLine x={peak.time} stroke="var(--color-aqi-poor)" strokeDasharray="2 2" />}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel className="flex flex-col gap-5 p-4">
          <h3 className="text-sm font-semibold">Scenario simulator</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Emission reduction</span>
              <span className="font-semibold text-primary">{emissionCut}%</span>
            </div>
            <Slider value={[emissionCut]} onValueChange={(v) => setEmissionCut(v[0])} max={60} step={5} />
            <p className="text-xs text-muted-foreground">Coordinated industrial + vehicular curbs (GRAP Stage III/IV).</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Wind ventilation boost</span>
              <span className="font-semibold text-primary">+{windBoost}%</span>
            </div>
            <Slider value={[windBoost]} onValueChange={(v) => setWindBoost(v[0])} max={100} step={10} />
            <p className="text-xs text-muted-foreground">Meteorological dispersion effect on accumulated load.</p>
          </div>
          <div className="mt-auto rounded-lg border border-border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground">Projected peak under scenario</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums" style={{ color: peak ? aqiColor(peak.scenario) : undefined }}>
                {peak?.scenario ?? "—"}
              </span>
              <span className="text-xs text-muted-foreground">µg/m³ · {peak ? aqiCategory(peak.scenario) : ""}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
