import type { SupabaseClient } from "@supabase/supabase-js"

import { extractExtraMetrics } from "@/lib/garmin/extra-metrics"
import type { ParsedFitFile } from "@/lib/garmin/fit-parser"
import { toIsoUtc } from "@/lib/garmin/format"
import { buildActivityLaps } from "@/lib/garmin/laps"
import { buildRoutePolyline } from "@/lib/garmin/polyline"
import type { SyncableSport } from "@/lib/garmin/sport-mapping"
import { resampleStreams } from "@/lib/garmin/streams"
import { fetchVigentThresholds } from "@/lib/garmin/thresholds"
import { computeActivityTss } from "@/lib/metrics/activity-tss"
import { computeNormalizedPower } from "@/lib/metrics/power"
import { computeTimeInZones } from "@/lib/metrics/time-in-zones"
import { computeBikePowerZones, computeHrZones } from "@/lib/metrics/zones"

// Só os campos do resumo da API de listagem do Garmin que o pipeline usa —
// evita depender do tipo interno (não exportado) da lib @gooin/garmin-connect.
export interface GarminActivitySummary {
  activityId: number
  activityName: string
  startTimeGMT: string
  duration: number
  movingDuration: number
  distance: number
  elevationGain: number
  averageHR: number
  maxHR: number
  activityType: { typeKey: string }
}

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

export interface ProcessActivityInput {
  userId: string
  activity: GarminActivitySummary
  sport: SyncableSport
  parsed: ParsedFitFile | null
  fitPath: string
}

export type ProcessActivityResult =
  | { status: "inserted"; startTime: string }
  | { status: "skipped" }

/**
 * Pipeline completo de uma atividade já baixada/parseada: TSS + zonas + laps
 * + streams + insert em `activities`/`activity_streams`. Extraído de
 * lib/garmin/sync.ts pra ser reusado pela importação histórica (2.9), que
 * baixa/parseia tudo antes (pra estimar limiares) e só depois processa cada
 * atividade — o download em si não é responsabilidade desta função.
 */
export async function processActivity(
  supabase: SupabaseClient,
  { userId, activity, sport, parsed, fitPath }: ProcessActivityInput
): Promise<ProcessActivityResult> {
  const externalId = String(activity.activityId)

  const session = parsed?.sessions[0]
  const records = parsed?.records ?? []
  const laps = parsed?.laps ?? []

  const startTime = toIsoUtc(activity.startTimeGMT)
  const durationSec = Math.round(session?.total_elapsed_time ?? activity.duration)
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
      name: activity.activityName,
      start_time: startTime,
      duration_s: durationSec,
      moving_time_s: Math.round(session?.total_timer_time ?? activity.movingDuration),
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
    return { status: "skipped" }
  }

  if (records.length > 0) {
    await supabase.from("activity_streams").insert({
      activity_id: insertedActivity.id,
      user_id: userId,
      resolution_s: STREAM_RESOLUTION_SEC,
      data: resampleStreams(records, STREAM_RESOLUTION_SEC),
    })
  }

  return { status: "inserted", startTime }
}
