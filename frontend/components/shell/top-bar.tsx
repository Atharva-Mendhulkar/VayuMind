'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Activity, Search, Wind } from 'lucide-react'
import { Dot } from '@/components/aeris/primitives'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOverview } from '@/lib/hooks'

function LiveClock() {
  const [now, setNow] = useState<string>('')
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      )
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-xs tabular-nums text-muted-foreground">
      {now} IST
    </span>
  )
}

const TITLES: Record<string, string> = {
  '/command': 'Command Center',
  '/attribution': 'Source Attribution',
  '/forecast': 'Forecasting',
  '/enforcement': 'Enforcement Intelligence',
  '/citizen': 'Citizen Intelligence',
  '/analytics': 'Multi-City Analytics',
  '/settings': 'Settings',
}

export function TopBar() {
  const pathname = usePathname()
  const title = TITLES[pathname] ?? 'Command Center'
  const { data: overview } = useOverview()
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border bg-panel/60 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            AERIS
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
            Intelligence OS
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground md:flex"
        >
          <Search className="size-3.5" />
          Search wards, sources, cases
          <kbd className="ml-2 rounded bg-elevated px-1 font-mono text-[10px]">⌘K</kbd>
        </button>

        <Select defaultValue="delhi">
          <SelectTrigger size="sm" className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delhi">Delhi NCR</SelectItem>
            <SelectItem value="mumbai">Mumbai</SelectItem>
            <SelectItem value="bangalore">Bangalore</SelectItem>
            <SelectItem value="chennai">Chennai</SelectItem>
            <SelectItem value="kolkata">Kolkata</SelectItem>
          </SelectContent>
        </Select>

        <div className="hidden items-center gap-3 rounded-md border border-border bg-background/50 px-2.5 py-1.5 lg:flex">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="size-3.5 text-primary" />
            <span className="font-mono tabular-nums text-foreground">
              {overview ? `${overview.stationsOnline}/${overview.stationsTotal}` : '—'}
            </span>
            sensors
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wind className="size-3.5 text-primary" />
            <span className="font-mono tabular-nums text-foreground">4.2</span>
            km/h NW
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Dot color="var(--aqi-good)" pulse />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
        <LiveClock />
      </div>
    </header>
  )
}
