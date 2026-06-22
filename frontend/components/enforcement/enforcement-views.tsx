"use client"

import { useMemo, useState } from "react"
import { useEnforcement } from "@/lib/hooks"
import { api } from "@/lib/api"
import { Panel, PanelHeader } from "@/components/aeris/primitives"
import { severityColor } from "@/lib/aqi"
import { cn } from "@/lib/utils"
import type { EnforcementCase, Severity } from "@/lib/types"
import { AlertTriangle, TrendingUp, MapPin, CheckCircle2, Send, ShieldAlert, Clock } from "lucide-react"

const PRIORITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const STATUS_LABEL: Record<EnforcementCase["status"], string> = {
  queued: "Queued",
  dispatched: "Dispatched",
  inspecting: "Inspecting",
  resolved: "Resolved",
}

export function EnforcementViews() {
  const { data, isLoading } = useEnforcement()
  const [dispatched, setDispatched] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [sort, setSort] = useState<"priority" | "roi" | "impact">("priority")

  const cases = useMemo(() => {
    if (!data) return []
    const copy = [...data]
    if (sort === "priority") copy.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.aqiImpact - a.aqiImpact)
    if (sort === "roi") copy.sort((a, b) => b.roi - a.roi)
    if (sort === "impact") copy.sort((a, b) => b.aqiImpact - a.aqiImpact)
    return copy
  }, [data, sort])

  const active = cases.find((c) => c.id === selected) ?? cases[0]

  async function dispatch(id: string) {
    setDispatched((d) => ({ ...d, [id]: true }))
    await api.enforce(id)
  }

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Ranking enforcement cases…</div>
  }

  const totalRoi = cases.reduce((a, c) => a + c.roi, 0)
  const critical = cases.filter((c) => c.priority === "critical").length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={ShieldAlert} label="Open cases" value={cases.filter((c) => c.status !== "resolved").length} tone="var(--aqi-unhealthy)" />
        <StatCard icon={AlertTriangle} label="Critical priority" value={critical} tone="var(--aqi-severe)" />
        <StatCard icon={TrendingUp} label="Projected AQI relief" value={`${totalRoi}`} suffix="pts" tone="var(--primary)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHeader title="Prioritized Case Queue" icon={AlertTriangle}>
            <div className="flex items-center gap-1">
              {(["priority", "roi", "impact"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] uppercase tracking-wide transition-colors",
                    sort === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </PanelHeader>
          <div className="scroll-thin max-h-[460px] divide-y divide-border overflow-y-auto">
            {cases.map((c) => {
              const isDispatched = dispatched[c.id] || c.status === "dispatched"
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated/50",
                    active?.id === c.id && "bg-elevated/60",
                  )}
                >
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: severityColor(c.priority) }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.site}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                        style={{ backgroundColor: `${severityColor(c.priority)}22`, color: severityColor(c.priority) }}
                      >
                        {c.priority}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {c.ward} · {c.sourceType} · {c.violations} violations
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-semibold text-foreground">+{c.roi}</div>
                    <div className="text-[10px] text-muted-foreground">{isDispatched ? STATUS_LABEL.dispatched : "ROI pts"}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader title="Case Detail" icon={MapPin} />
          {active && (
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{active.site}</h3>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                    style={{ backgroundColor: `${severityColor(active.priority)}22`, color: severityColor(active.priority) }}
                  >
                    {active.priority}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{active.ward} · {active.sourceType}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Mini label="AQI impact" value={`+${active.aqiImpact}`} />
                <Mini label="Confidence" value={`${Math.round(active.confidence * 100)}%`} />
                <Mini label="Last seen" value={active.lastInspected} />
              </div>

              <div className="rounded-lg border border-border bg-elevated/40 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                  <ShieldAlert className="h-3.5 w-3.5" /> AI Recommendation
                </div>
                <p className="text-sm leading-relaxed text-foreground">{active.recommendation}</p>
              </div>

              <div className="mt-auto flex items-center gap-2">
                {dispatched[active.id] || active.status === "dispatched" ? (
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 py-2.5 text-sm font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Field unit dispatched
                  </div>
                ) : (
                  <button
                    onClick={() => dispatch(active.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Send className="h-4 w-4" /> Dispatch enforcement
                  </button>
                )}
                <div className="flex items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> ETA 2h
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, suffix, tone }: { icon: any; label: string; value: string | number; suffix?: string; tone: string }) {
  return (
    <Panel className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}1f`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums">
          {value} {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
        </div>
      </div>
    </Panel>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}
