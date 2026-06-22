'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  Sparkles,
  GitBranch,
  Radar,
  ShieldAlert,
  HeartPulse,
  AlertTriangle,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Panel, PanelHeader } from '@/components/aeris/primitives'
import { useInsights } from '@/lib/hooks'
import { severityColor } from '@/lib/aqi'
import type { AiInsight } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICONS: Record<AiInsight['kind'], LucideIcon> = {
  attribution: GitBranch,
  forecast: Radar,
  enforcement: ShieldAlert,
  health: HeartPulse,
  anomaly: AlertTriangle,
}

const SUGGESTIONS = [
  'What is driving AQI in east Delhi?',
  'Forecast peak for next 12 hours',
  'Which sites need inspection today?',
]

export function AiPanel() {
  const { data: insights } = useInsights()
  const [query, setQuery] = useState('')

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-border bg-sidebar/60">
      <PanelHeader
        title="AERIS Intelligence"
        icon={Sparkles}
        action={
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Analyzing
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto scroll-thin p-3">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Live Insights
        </div>
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial>
            {(insights ?? []).map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 focus-within:border-primary/40"
        >
          <Sparkles className="size-4 shrink-0 text-primary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask AERIS about air quality…"
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary transition-colors hover:bg-primary/25"
            aria-label="Send query"
          >
            <Send className="size-3.5" />
          </button>
        </form>
      </div>
    </aside>
  )
}

function InsightCard({ insight, index }: { insight: AiInsight; index: number }) {
  const Icon = ICONS[insight.kind]
  const color = severityColor(insight.severity)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-lg border border-border bg-panel/80 p-3"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">{insight.title}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {insight.body}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn('rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide')}
              style={{ backgroundColor: `${color}1f`, color }}
            >
              {insight.kind}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {Math.round(insight.confidence * 100)}% conf
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
