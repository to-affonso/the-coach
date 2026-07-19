import { WatchIcon } from "@phosphor-icons/react/dist/ssr"

import { EmptyState } from "@/components/empty-state"

// Placeholder do estado vazio (task 1.4, spec Feed). Feed real na 2.7.
export default function FeedPage() {
  return (
    <EmptyState
      icon={WatchIcon}
      title="Conecte seu Garmin para ver seus treinos aqui"
      description="Assim que sua conta estiver conectada, seus treinos aparecem aqui automaticamente."
      actionLabel="Conectar Garmin"
      actionHref="/perfil"
    />
  )
}
