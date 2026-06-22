'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Crosshair,
  GitBranch,
  Radar,
  ShieldAlert,
  HeartPulse,
  Globe2,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { href: '/command', label: 'Command Center', icon: Crosshair },
  { href: '/attribution', label: 'Source Attribution', icon: GitBranch },
  { href: '/forecast', label: 'Forecasting', icon: Radar },
  { href: '/enforcement', label: 'Enforcement Intelligence', icon: ShieldAlert },
  { href: '/citizen', label: 'Citizen Intelligence', icon: HeartPulse },
  { href: '/analytics', label: 'Multi-City Analytics', icon: Globe2 },
]

export function NavRail() {
  const pathname = usePathname()
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3">
      <Link
        href="/command"
        className="mb-3 flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary"
        aria-label="AERIS home"
      >
        <Crosshair className="size-5" />
      </Link>
      <div className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground',
                      active && 'bg-elevated text-primary',
                    )}
                  >
                    {active ? (
                      <span className="absolute left-0 h-5 w-0.5 rounded-r bg-primary" />
                    ) : null}
                    <item.icon className="size-[18px]" />
                  </Link>
                }
              />
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/settings"
              aria-label="Settings"
              className={cn(
                'flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground',
                pathname === '/settings' && 'bg-elevated text-primary',
              )}
            >
              <Settings className="size-[18px]" />
            </Link>
          }
        />
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    </nav>
  )
}
