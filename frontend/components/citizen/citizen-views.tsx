"use client"

import { useMemo, useState } from "react"
import { useWards, useFacilities } from "@/lib/hooks"
import { Panel, PanelHeader, AqiBadge } from "@/components/aeris/primitives"
import { aqiColor, severityColor } from "@/lib/aqi"
import { cn } from "@/lib/utils"
import type { Facility } from "@/lib/types"
import { Users, School, Building2, HardHat, HeartPulse, ShieldAlert } from "lucide-react"

const FACILITY_ICON = { school: School, hospital: Building2, construction: HardHat } as const

export function CitizenViews() {
  const { data: wards } = useWards()
  const { data: facilities } = useFacilities()
  const [facFilter, setFacFilter] = useState<"all" | Facility["type"]>("all")

  const rankedWards = useMemo(() => (wards ? [...wards].sort((a, b) => b.riskScore - a.riskScore) : []), [wards])
  const filteredFac = useMemo(() => {
    if (!facilities) return []
    const f = facFilter === "all" ? facilities : facilities.filter((x) => x.type === facFilter)
    return [...f].sort((a, b) => b.aqi - a.aqi)
  }, [facilities, facFilter])

  const exposedPop = useMemo(
    () => rankedWards.filter((w) => w.aqi > 300).reduce((a, w) => a + w.population, 0),
    [rankedWards],
  )
  const criticalFac = filteredFac.filter((f) => f.exposure === "critical").length

  if (!wards || !facilities) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Computing exposure index…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="Population in severe air" value={`${(exposedPop / 1e6).toFixed(1)}M`} tone="var(--aqi-severe)" />
        <Stat icon={ShieldAlert} label="Critical-exposure facilities" value={criticalFac} tone="var(--aqi-unhealthy)" />
        <Stat icon={HeartPulse} label="Active health advisories" value={3} tone="var(--accent)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Ward Risk Ranking" icon={Users} />
          <div className="scroll-thin max-h-[440px] overflow-y-auto p-2">
            {rankedWards.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-elevated/40">
                <span className="w-5 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{w.name}</span>
                    <AqiBadge value={w.aqi} />
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                    <div className="h-full rounded-full" style={{ width: `${w.riskScore}%`, backgroundColor: severityColor(w.riskScore > 70 ? "critical" : w.riskScore > 50 ? "high" : "medium") }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">{w.riskScore}</div>
                  <div className="text-[10px] text-muted-foreground">{(w.population / 1000).toFixed(0)}k ppl</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Vulnerable Facilities" icon={School}>
            <div className="flex items-center gap-1">
              {(["all", "school", "hospital", "construction"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFacFilter(f)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] capitalize transition-colors",
                    facFilter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </PanelHeader>
          <div className="scroll-thin max-h-[440px] overflow-y-auto p-2">
            {filteredFac.slice(0, 30).map((f) => {
              const Icon = FACILITY_ICON[f.type]
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-elevated/40">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">{f.type}</div>
                  </div>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                    style={{ backgroundColor: `${severityColor(f.exposure)}22`, color: severityColor(f.exposure) }}
                  >
                    {f.exposure}
                  </span>
                  <span className="w-9 text-right font-mono text-sm font-semibold tabular-nums" style={{ color: aqiColor(f.aqi) }}>
                    {f.aqi}
                  </span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <PanelHeader title="Personalized Health Advisories" icon={HeartPulse} />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {ADVISORIES.map((a) => (
            <div key={a.title} className="rounded-lg border border-border bg-elevated/40 p-3">
              <div className="text-sm font-semibold" style={{ color: a.tone }}>{a.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

const ADVISORIES = [
  { title: "Sensitive groups", body: "Children, elderly, and those with respiratory conditions should avoid outdoor exertion until 14:00.", tone: "var(--aqi-severe)" },
  { title: "Schools", body: "Recommend indoor recess and mask distribution across 23 wards with AQI > 300.", tone: "var(--aqi-unhealthy)" },
  { title: "General public", body: "Use N95 masks outdoors. Air purifiers advised indoors in central and east Delhi.", tone: "var(--accent)" },
]

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <Panel className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}1f`, color: tone }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </div>
    </Panel>
  )
}
