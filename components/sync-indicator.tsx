import { CloudCheckIcon } from "@phosphor-icons/react/dist/ssr"

// Estático por ora (task 1.4). Estado real de conexão/sync entra na 2.6.
export function SyncIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CloudCheckIcon className="size-4" />
      <span className="hidden sm:inline">Sincronizado</span>
    </div>
  )
}
