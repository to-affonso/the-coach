import { AppSidebar } from "@/components/app-sidebar"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { SyncIndicator } from "@/components/sync-indicator"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator
            orientation="vertical"
            className="mr-2 hidden h-4 md:block"
          />
          <span className="font-semibold">The Coach</span>
          <div className="ml-auto">
            <SyncIndicator />
          </div>
        </header>
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </SidebarInset>
      <BottomTabBar />
    </SidebarProvider>
  )
}
