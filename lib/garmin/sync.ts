import { createAdminClient } from "@/lib/db/admin"
import {
  restoreGarminSession,
  translateGarminError,
  type GarminTokens,
} from "@/lib/garmin/auth"
import { decrypt, encrypt } from "@/lib/garmin/crypto"
import { downloadOriginalFit } from "@/lib/garmin/download"
import { toIsoUtc } from "@/lib/garmin/format"
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

    const { error: insertError } = await supabase.from("activities").insert({
      user_id: userId,
      source: "garmin",
      external_id: externalId,
      sport,
      start_time: toIsoUtc(activity.startTimeGMT),
      duration_s: Math.round(activity.duration),
      moving_time_s: Math.round(activity.movingDuration),
      distance_m: activity.distance,
      elevation_gain_m: activity.elevationGain,
      avg_hr: activity.averageHR,
      max_hr: activity.maxHR,
      fit_file_path: fitPath,
    })

    if (insertError) {
      // 23505 = violação de UNIQUE -> já sincronizada antes (dedupe correto).
      skipped++
      continue
    }

    inserted++
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
