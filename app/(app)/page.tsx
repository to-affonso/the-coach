import { WatchIcon } from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"

import { EmptyState } from "@/components/empty-state"
import { FeedList } from "@/components/feed/feed-list"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchActivitiesPage } from "@/lib/db/activities"
import { createClient } from "@/lib/db/server"

export default async function FeedPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data!.claims.sub as string

  const [{ data: profile }, { data: connection }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).single(),
    supabase
      .from("garmin_connections")
      .select("status, last_error, last_sync_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  const timezone = profile?.timezone ?? "UTC"
  const status = connection?.status ?? "disconnected"

  if (status === "disconnected") {
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

  const { activities, nextCursor } = await fetchActivitiesPage(supabase, userId)

  // Primeiro sync já foi disparado ao conectar (2.6: last_sync_at nulo
  // dispara sync no próximo foco/abertura) — sem ação manual necessária.
  if (activities.length === 0 && !connection?.last_sync_at) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">Importando seus treinos…</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          O primeiro sync com o Garmin já foi disparado. Assim que terminar,
          seus treinos aparecem aqui.
        </p>
        <div className="flex w-full max-w-md flex-col gap-3 pt-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      {status === "error" || status === "expired" ? (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>
            Não conseguimos falar com o Garmin —{" "}
            <Link href="/perfil" className="underline">
              reconectar
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      {activities.length === 0 ? (
        <EmptyState
          icon={WatchIcon}
          title="Nenhum treino sincronizado ainda"
          description="Assim que o Garmin sincronizar atividades, elas aparecem aqui."
        />
      ) : (
        <FeedList
          initialActivities={activities}
          initialCursor={nextCursor}
          timezone={timezone}
        />
      )}
    </div>
  )
}
