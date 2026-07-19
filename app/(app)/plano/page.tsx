import { TargetIcon } from "@phosphor-icons/react/dist/ssr"

import { EmptyState } from "@/components/empty-state"

// Placeholder do estado vazio (task 1.4, spec Plano: "sem plano"). Onboarding/geração reais na Fase 3.
export default function PlanoPage() {
  return (
    <EmptyState
      icon={TargetIcon}
      title="Vamos montar seu plano"
      description="Responda algumas perguntas sobre sua rotina e objetivo — com ou sem prova marcada — e a gente monta a temporada."
      actionLabel="Criar meu plano"
      actionDisabled
    />
  )
}
