'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { ComponentProps } from 'react'

const AerisMap = dynamic(() => import('./aeris-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-grid bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Initializing geospatial layers…
      </div>
    </div>
  ),
})

export function MapCanvas(props: ComponentProps<typeof AerisMap>) {
  return <AerisMap {...props} />
}
