'use client'

import { cn } from '@/lib/utils'
import { bandFor } from '@/lib/aqi'
import type { LucideIcon } from 'lucide-react'

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-panel/80 backdrop-blur-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function PanelHeader({
  title,
  icon: Icon,
  action,
  className,
}: {
  title: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 border-b border-border px-3 py-2.5',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-foreground">
        {Icon ? <Icon className="size-3.5 text-primary" /> : null}
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </span>
      </div>
      {action}
    </div>
  )
}

export function Metric({
  label,
  value,
  unit,
  delta,
  className,
}: {
  label: string
  value: string | number
  unit?: string
  delta?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
        {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        {typeof delta === 'number' ? (
          <span
            className={cn(
              'ml-1 text-xs font-medium tabular-nums',
              delta > 0 ? 'text-aqi-unhealthy' : 'text-aqi-good',
            )}
          >
            {delta > 0 ? '+' : ''}
            {delta}%
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function AqiBadge({ aqi, size = 'sm' }: { aqi: number; size?: 'sm' | 'md' | 'lg' }) {
  const band = bandFor(aqi)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-mono font-semibold tabular-nums',
        size === 'sm' && 'px-1.5 py-0.5 text-xs',
        size === 'md' && 'px-2 py-1 text-sm',
        size === 'lg' && 'px-2.5 py-1 text-base',
      )}
      style={{ backgroundColor: `${band.hex}22`, color: band.hex }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: band.hex }} />
      {aqi}
    </span>
  )
}

export function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative inline-flex">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {pulse ? (
        <span
          className="animate-pulse-ring absolute inset-0 size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
    </span>
  )
}
