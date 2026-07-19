import type { Icon } from "@phosphor-icons/react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: Icon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  /** Ação ainda não existe (fluxo de fase futura) — mostra o botão desabilitado em vez de linká-lo. */
  actionDisabled?: boolean
}

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  actionLabel,
  actionHref,
  actionDisabled,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 p-6 text-center">
      <IconComponent className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionDisabled ? (
        <Button disabled className="mt-2">
          {actionLabel}
        </Button>
      ) : actionLabel && actionHref ? (
        <Button asChild className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
