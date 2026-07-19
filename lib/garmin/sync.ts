import { createAdminClient } from "@/lib/db/admin"
import { recalculateDailyMetricsFrom } from "@/lib/db/daily-metrics"
import {
  restoreGarminSession,
  translateGarminError,
  type GarminTokens,
} from "@/lib/garmin/auth"
import { decrypt, encrypt } from "@/lib/garmin/crypto"
import { downloadOriginalFit } from "@/lib/garmin/download"
import { parseFitFile } from "@/lib/garmin/fit-parser"
import { processActivity } from "@/lib/garmin/process-activity"
import { mapGarminSportType } from "@/lib/garmin/sport-mapping"

export interface SyncResult {
  inserted: number
  skipped: number
}

// Sem filtro de data na chamada ao Garmin (formato de data da API não é
// documentado e testar contra conta real é arriscado): busca as N atividades
// mais recentes e deixa a UNIQUE (user_id, source, external_id) de
// `activities` garantir que rodar o sync de novo não duplica nada.
const RECENT_ACTIVITIES_LIMIT = 50

/**
 * Sync incremental de rotina (2.3/2.6): busca as atividades recentes e
 * processa cada uma. Assume que limiares (se existirem) já foram
 * estabelecidos antes — a primeira conexão do usuário passa pela importação
 * histórica (lib/garmin/historical-import.ts), não por aqui (ver
 * lib/garmin/sync-dispatch.ts).
 */
export async function syncUserGarminActivities(
  userId: string
): Promise<SyncResult> {
  const supabase = createAdminClient()

  const { data: connection } = await supabase
    .from("garmin_connections")
    .select("oauth_tokens")
    .eq("user_id", userId)
    .single()

  if (!connection?.oauth_tokens) {
    throw new Error("Nenhuma conexão Garmin ativa para este usuário.")
  }

  const tokens: GarminTokens = JSON.parse(decrypt(connection.oauth_tokens))
  const client = restoreGarminSession(tokens)

  // A lib pode renovar o OAuth2 sozinha (via OAuth1) durante as chamadas
  // abaixo; persiste qualquer sessão nova cifrada, sem esperar o fim do sync.
  client.onSessionChange((session) => {
    void supabase
      .from("garmin_connections")
      .update({ oauth_tokens: encrypt(JSON.stringify(session)) })
      .eq("user_id", userId)
  })

  let activities
  try {
    activities = await client.getActivities(0, RECENT_ACTIVITIES_LIMIT)
  } catch (error) {
    const loginError = translateGarminError(error)
    await supabase
      .from("garmin_connections")
      .update({ status: "error", last_error: loginError.message })
      .eq("user_id", userId)
    throw loginError
  }

  let inserted = 0
  let skipped = 0
  // Data mais antiga entre as atividades inseridas nesta corrida — o PMC só
  // precisa recalcular a partir dali (dias antes não mudaram).
  let earliestInsertedStartTime: string | undefined

  for (const activity of activities) {
    const sport = mapGarminSportType(activity.activityType.typeKey)
    if (!sport) {
      skipped++
      continue
    }

    const externalId = String(activity.activityId)

    let fitBuffer: Buffer
    try {
      fitBuffer = await downloadOriginalFit(client, activity.activityId)
    } catch {
      // Arquivo original indisponível não deve travar o resto do sync.
      skipped++
      continue
    }

    const fitPath = `${userId}/${externalId}.fit`
    const { error: uploadError } = await supabase.storage
      .from("fit-files")
      .upload(fitPath, fitBuffer, {
        contentType: "application/octet-stream",
        upsert: true,
      })

    if (uploadError) {
      skipped++
      continue
    }

    // Um FIT que falha ao parsear não deve travar o sync: a atividade ainda
    // entra com o resumo básico do Garmin Connect, sem métricas detalhadas.
    const parsed = await parseFitFile(fitBuffer).catch(() => null)

    const result = await processActivity(supabase, {
      userId,
      activity,
      sport,
      parsed,
      fitPath,
    })

    if (result.status === "skipped") {
      skipped++
      continue
    }

    inserted++
    if (!earliestInsertedStartTime || result.startTime < earliestInsertedStartTime) {
      earliestInsertedStartTime = result.startTime
    }
  }

  if (earliestInsertedStartTime) {
    await recalculateDailyMetricsFrom(supabase, userId, earliestInsertedStartTime)
  }

  await supabase
    .from("garmin_connections")
    .update({
      status: "active",
      last_error: null,
      last_sync_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  return { inserted, skipped }
}
