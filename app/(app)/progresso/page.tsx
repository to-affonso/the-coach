import { ChartLineUpIcon } from "@phosphor-icons/react/dist/ssr"

import { EmptyState } from "@/components/empty-state"

// Placeholder do estado vazio (task 1.4). PMC/gráficos reais na 4.5.
export default function ProgressoPage() {
  return (
    <EmptyState
      icon={ChartLineUpIcon}
      title="Sua evolução aparece aqui"
      description="Conecte o Garmin ou registre um treino para começar a ver Fitness, Fadiga e Forma ao longo do tempo."
      actionLabel="Conectar Garmin"
      actionHref="/perfil"
    />
  )
}
