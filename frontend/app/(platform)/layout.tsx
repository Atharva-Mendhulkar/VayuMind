import { NavRail } from '@/components/shell/nav-rail'
import { TopBar } from '@/components/shell/top-bar'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
