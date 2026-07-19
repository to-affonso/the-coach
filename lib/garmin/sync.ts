import { createAdminClient } from "@/lib/db/admin"
import {
  restoreGarminSession,
  translateGarminError,
  type GarminTokens,
} from "@/lib/garmin/auth"
import { decrypt, encrypt } from "@/lib/garmin/crypto"
import { downloadOriginalFit } from "@/lib/garmin/download"
import { extractExtraMetrics } from "@/lib/garmin/extra-metrics"
import { parseFitFile } from "@/lib/garmin/fit-parser"
import { toIsoUtc } from "@/lib/garmin/format"
import { buildActivityLaps } from "@/lib/garmin/laps"
import { buildRoutePolyline } from "@/lib/garmin/polyline"
import { mapGarminSportType } from "@/lib/garmin/sport-mapping"
import { resampleStreams } from "@/lib/garmin/streams"
import { fetchVigentThresholds } from "@/lib/garmin/thresholds"
import { computeActivityTss } from "@/lib/metrics/activity-tss"
import { computeNormalizedPower } from "@/lib/metrics/power"
import { computeTimeInZones } from "@/lib/metrics/time-in-zones"
import { computeBikePowerZones, computeHrZones } from "@/lib/metrics/zones"

export interface SyncResult {
  inserted: number
  skipped: number
}

// Sem filtro de data na chamada ao Garmin (formato de data da API não é
// documentado e testar contra conta real é arriscado): busca as N atividades
// mais recentes e deixa a UNIQUE (user_id, source, external_id) de
// `activities` garantir que rodar o sync de novo não duplica nada.
const RECENT_ACTIVITIES_LIMIT = 50

// Dispositivos Garmin gravam por padrão a cada 1s ("every second recording");
// smart recording (intervalo variável) é bem menos comum e não é
// distinguido aqui — simplificação documentada, consistente com o resto do
// ecossistema de ferramentas de treino.
const NATIVE_SAMPLE_INTERVAL_SEC = 1
const STREAM_RESOLUTION_SEC = 5

function computeAvgPaceSecPerUnit(
  durationSec: number,
  distanceM: number | undefined,
  unitMeters: number
): number | undefined {
  if (!distanceM || distanceM <= 0) return undefined
  return durationSec / (distanceM / unitMeters)
}

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

    // Um FIT que falha ao parsear não deve travar o sync: a atividade ainda
    // entra com o resumo básico do Garmin Connect, sem métricas detalhadas.
    const parsed = await parseFitFile(fitBuffer).catch(() => null)
    const session = parsed?.sessions[0]
    const records = parsed?.records ?? []
    const laps = parsed?.laps ?? []

    const startTime = toIsoUtc(activity.startTimeGMT)
    const durationSec = Math.round(
      session?.total_elapsed_time ?? activity.duration
    )
    const distanceM = session?.total_distance ?? activity.distance

    const hrStream = records
      .map((r) => r.heart_rate)
      .filter((v): v is number => v !== undefined)
    const powerStream = records
      .map((r) => r.power)
      .filter((v): v is number => v !== undefined)

    const avgPaceSecPerUnit =
      sport === "run"
        ? computeAvgPaceSecPerUnit(durationSec, distanceM, 1000)
        : sport === "swim"
          ? computeAvgPaceSecPerUnit(durationSec, distanceM, 100)
          : undefined

    const thresholds = await fetchVigentThresholds(
      supabase,
      userId,
      sport,
      new Date(startTime)
    )

    const { tss, intensityFactor, thresholdSnapshot } = computeActivityTss({
      sport,
      durationSec,
      sampleIntervalSec: NATIVE_SAMPLE_INTERVAL_SEC,
      powerStream: powerStream.length > 0 ? powerStream : undefined,
      hrStream: hrStream.length > 0 ? hrStream : undefined,
      avgPaceSecPerUnit,
      avgHr: session?.avg_heart_rate ?? activity.averageHR,
      thresholds,
    })

    const hrZoneReference = thresholds.lthr ?? thresholds.max_hr
    const hrZones = hrZoneReference
      ? computeTimeInZones(
          records.map((r) => r.heart_rate),
          NATIVE_SAMPLE_INTERVAL_SEC,
          computeHrZones(hrZoneReference)
        )
      : null

    const powerZones =
      sport === "bike" && thresholds.ftp
        ? computeTimeInZones(
            records.map((r) => r.power),
            NATIVE_SAMPLE_INTERVAL_SEC,
            computeBikePowerZones(thresholds.ftp)
          )
        : null

    const gpsPoints = records
      .filter(
        (r): r is typeof r & { position_lat: number; position_long: number } =>
          r.position_lat !== undefined && r.position_long !== undefined
      )
      .map((r) => ({ lat: r.position_lat, lng: r.position_long }))

    const { error: insertError, data: insertedActivity } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        source: "garmin",
        external_id: externalId,
        sport,
        start_time: startTime,
        duration_s: durationSec,
        moving_time_s: Math.round(
          session?.total_timer_time ?? activity.movingDuration
        ),
        distance_m: distanceM,
        elevation_gain_m: session?.total_ascent ?? activity.elevationGain,
        avg_hr: session?.avg_heart_rate ?? activity.averageHR,
        max_hr: session?.max_heart_rate ?? activity.maxHR,
        avg_power: session?.avg_power,
        normalized_power:
          powerStream.length > 0
            ? computeNormalizedPower(powerStream, NATIVE_SAMPLE_INTERVAL_SEC)
            : undefined,
        avg_cadence: session?.avg_cadence,
        avg_speed_mps: session?.avg_speed,
        tss,
        intensity_factor: intensityFactor,
        threshold_snapshot: thresholdSnapshot,
        hr_zones: hrZones,
        power_zones: powerZones,
        laps: buildActivityLaps(laps),
        route_polyline: buildRoutePolyline(gpsPoints),
        extra_metrics: extractExtraMetrics(session),
        fit_file_path: fitPath,
      })
      .select("id")
      .single()

    if (insertError) {
      // 23505 = violação de UNIQUE -> já sincronizada antes (dedupe correto).
      skipped++
      continue
    }

    if (records.length > 0) {
      await supabase.from("activity_streams").insert({
        activity_id: insertedActivity.id,
        user_id: userId,
        resolution_s: STREAM_RESOLUTION_SEC,
        data: resampleStreams(records, STREAM_RESOLUTION_SEC),
      })
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
