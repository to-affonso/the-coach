import { notFound } from "next/navigation"

import { ActivityDetail } from "@/components/atividade/activity-detail"
import { fetchActivityDetail } from "@/lib/db/activities"
import { createClient } from "@/lib/db/server"

// Rota compartilhada Feed/Calendário (spec-telas.md > "Fora do escopo": "mesma
// rota do Feed"). Calendário ainda não existe (Fase 3) — só o Feed linka aqui por ora.
export default async function AtividadeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data!.claims.sub as string

  const [{ data: profile }, detail] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).single(),
    fetchActivityDetail(supabase, userId, id),
  ])

  if (!detail.activity) notFound()

  return (
    <ActivityDetail
      activity={detail.activity}
      streams={detail.streams}
      insightHeadline={detail.insightHeadline}
      insightText={detail.insightText}
      timezone={profile?.timezone ?? "UTC"}
    />
  )
}
