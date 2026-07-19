import { createAdminClient } from "@/lib/db/admin"
import { recalculateDailyMetricsFrom } from "@/lib/db/daily-metrics"
import {
  restoreGarminSession,
  translateGarminError,
  type GarminTokens,
} from "@/lib/garmin/auth"
import { decrypt, encrypt } from "@/lib/garmin/crypto"
import { downloadOriginalFit } from "@/lib/garmin/download"
import { parseFitFile, type ParsedFitFile } from "@/lib/garmin/fit-parser"
import { toIsoUtc } from "@/lib/garmin/format"
import {
  processActivity,
  type GarminActivitySummary,
} from "@/lib/garmin/process-activity"
import { mapGarminSportType, type SyncableSport } from "@/lib/garmin/sport-mapping"
import type { SyncResult } from "@/lib/garmin/sync"
import {
  saveEstimatedThresholds,
  type PreparedActivityForEstimation,
} from "@/lib/garmin/threshold-estimation"

const HISTORICAL_IMPORT_DAYS = 90
const HISTORICAL_PAGE_SIZE = 100
// Rede de segurança contra paginação infinita (ex.: filtro de data da API
// não funcionar como esperado) — até 1000 atividades no histórico.
const HISTORICAL_MAX_PAGES = 10

interface PreparedActivity {
  activity: GarminActivitySummary
  sport: SyncableSport
  fitPath: string
  parsed: ParsedFitFile | null
}

/**
 * Importação histórica de 90 dias (2.9), disparada uma única vez na primeira
 * conexão (ver lib/garmin/sync-dispatch.ts: last_sync_at nulo => aqui, não no
 * sync incremental de rotina). Baixa e parseia tudo primeiro, estima
 * limiares dos melhores esforços encontrados e grava-os ANTES de processar
 * as atividades — assim o TSS de cada uma já nasce threshold-aware, sem
 * precisar de recálculo retroativo depois (rule 6: nada muda o passado).
 */
export async function importHistoricalActivities(
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

  client.onSessionChange((session) => {
    void supabase
      .from("garmin_connections")
      .update({ oauth_tokens: encrypt(JSON.stringify(session)) })
      .eq("user_id", userId)
  })

  const cutoffDate = new Date()
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - HISTORICAL_IMPORT_DAYS)
  const startDateStr = cutoffDate.toISOString().slice(0, 10)
  const endDateStr = new Date().toISOString().slice(0, 10)

  let rawActivities: GarminActivitySummary[] = []
  try {
    for (let page = 0; page < HISTORICAL_MAX_PAGES; page++) {
      const batch = await client.getActivities(
        page * HISTORICAL_PAGE_SIZE,
        HISTORICAL_PAGE_SIZE,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        startDateStr,
        endDateStr
      )
      if (batch.length === 0) break
      rawActivities.push(...batch)
      if (batch.length < HISTORICAL_PAGE_SIZE) break

      // Se o filtro de data da API não funcionar como esperado, para quando
      // a atividade mais antiga da página já passou do corte de 90 dias.
      const oldestInBatch = new Date(toIsoUtc(batch[batch.length - 1].startTimeGMT))
      if (oldestInBatch < cutoffDate) break
    }
  } catch (error) {
    const loginError = translateGarminError(error)
    await supabase
      .from("garmin_connections")
      .update({ status: "error", last_error: loginError.message })
      .eq("user_id", userId)
    throw loginError
  }

  rawActivities = rawActivities.filter(
    (activity) => new Date(toIsoUtc(activity.startTimeGMT)) >= cutoffDate
  )

  // 1) Baixa + parseia tudo uma única vez, mantendo em memória (evita baixar
  // e parsear cada FIT duas vezes entre a estimativa e o processamento).
  const prepared: PreparedActivity[] = []
  let skipped = 0

  for (const activity of rawActivities) {
    const sport = mapGarminSportType(activity.activityType.typeKey)
    if (!sport) {
      skipped++
      continue
    }

    let fitBuffer: Buffer
    try {
      fitBuffer = await downloadOriginalFit(client, activity.activityId)
    } catch {
      skipped++
      continue
    }

    const fitPath = `${userId}/${activity.activityId}.fit`
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

    const parsed = await parseFitFile(fitBuffer).catch(() => null)
    prepared.push({ activity, sport, fitPath, parsed })
  }

  // 2) Estima limiares a partir dos melhores esforços, ANTES de processar
  // qualquer atividade — o TSS de cada uma precisa do limiar já disponível.
  if (prepared.length > 0) {
    const forEstimation: PreparedActivityForEstimation[] = prepared.map((p) => ({
      sport: p.sport,
      records: p.parsed?.records ?? [],
    }))

    const earliestStartTime = prepared.reduce<string | undefined>(
      (earliest, p) => {
        const startTime = toIsoUtc(p.activity.startTimeGMT)
        return !earliest || startTime < earliest ? startTime : earliest
      },
      undefined
    )!

    await saveEstimatedThresholds(
      supabase,
      userId,
      forEstimation,
      earliestStartTime.slice(0, 10)
    )
  }

  // 3) Processa e insere cada atividade, agora com limiares disponíveis.
  let inserted = 0
  let earliestInsertedStartTime: string | undefined

  for (const { activity, sport, parsed, fitPath } of prepared) {
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
