import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr"

import { EmptyState } from "@/components/empty-state"

// Placeholder do estado vazio (task 1.4, spec Calendário: "sem plano ativo"). Calendário real na 3.5.
export default function CalendarioPage() {
  return (
    <EmptyState
      icon={CalendarBlankIcon}
      title="Você ainda não tem um plano"
      description="Crie um plano para ver seus treinos planejados aqui, lado a lado com os realizados."
      actionLabel="Criar plano"
      actionHref="/plano"
    />
  )
}
