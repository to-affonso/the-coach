import type { SupabaseClient } from "@supabase/supabase-js"

import type { FitRecord } from "@/lib/garmin/fit-parser"
import type { SyncableSport } from "@/lib/garmin/sport-mapping"
import { computeBestSustainedAverage } from "@/lib/metrics/best-effort"

// Janelas e fator de desconto: FTP documentado em contratos-ia.md ("melhor
// potência de 20min × 0,95"); pace/CSS/LTHR generalizam o mesmo princípio
// (melhor esforço sustentado), aprovados no chat de planejamento da 2.9.
const FTP_WINDOW_MINUTES = 20
const FTP_DISCOUNT = 0.95
const RUN_THRESHOLD_PACE_WINDOW_MINUTES = 20
const SWIM_CSS_WINDOW_MINUTES = 15
const LTHR_WINDOW_MINUTES = 20

export interface PreparedActivityForEstimation {
  sport: SyncableSport
  records: FitRecord[]
}

type ThresholdSport = "swim" | "bike" | "run"

export interface ThresholdEstimate {
  sport: ThresholdSport
  metric: "ftp" | "threshold_pace" | "css" | "lthr"
  value: number
}

function bestOverActivities(
  activities: PreparedActivityForEstimation[],
  sport: SyncableSport,
  channel: "power" | "heart_rate" | "speed",
  windowMinutes: number
): number | null {
  let best: number | null = null

  for (const activity of activities) {
    if (activity.sport !== sport) continue

    const series = activity.records
      .map((record) => record[channel])
      .filter((value): value is number => value !== undefined)

    // Amostragem nativa ~1s (mesma premissa do resto do pipeline de sync).
    const result = computeBestSustainedAverage(series, 1, windowMinutes)
    if (result !== null && (best === null || result > best)) best = result
  }

  return best
}

/**
 * Estima limiares (FTP, threshold_pace, CSS, LTHR por esporte) a partir do
 * melhor esforço sustentado encontrado no histórico importado. Esporte/
 * métrica sem dado suficiente (nenhuma atividade cobre a janela) fica de
 * fora — nunca força uma estimativa de dado insuficiente.
 */
export function estimateThresholds(
  activities: PreparedActivityForEstimation[]
): ThresholdEstimate[] {
  const estimates: ThresholdEstimate[] = []

  const bestPower = bestOverActivities(activities, "bike", "power", FTP_WINDOW_MINUTES)
  if (bestPower !== null) {
    estimates.push({ sport: "bike", metric: "ftp", value: Math.round(bestPower * FTP_DISCOUNT) })
  }

  const bestRunSpeed = bestOverActivities(
    activities,
    "run",
    "speed",
    RUN_THRESHOLD_PACE_WINDOW_MINUTES
  )
  if (bestRunSpeed !== null && bestRunSpeed > 0) {
    estimates.push({
      sport: "run",
      metric: "threshold_pace",
      value: Math.round(1000 / bestRunSpeed),
    })
  }

  const bestSwimSpeed = bestOverActivities(
    activities,
    "swim",
    "speed",
    SWIM_CSS_WINDOW_MINUTES
  )
  if (bestSwimSpeed !== null && bestSwimSpeed > 0) {
    estimates.push({
      sport: "swim",
      metric: "css",
      value: Math.round(100 / bestSwimSpeed),
    })
  }

  for (const sport of ["swim", "bike", "run"] as const) {
    const bestHr = bestOverActivities(activities, sport, "heart_rate", LTHR_WINDOW_MINUTES)
    if (bestHr !== null) {
      estimates.push({ sport, metric: "lthr", value: Math.round(bestHr) })
    }
  }

  return estimates
}

/**
 * Grava as estimativas com source='data_estimate' e effective_from na data
 * da atividade mais antiga importada — assim, quando cada atividade do lote
 * é processada (fetchVigentThresholds), o limiar já existe pra toda a janela
 * histórica: o TSS de cada uma nasce correto, sem precisar de recálculo
 * retroativo depois (rule 6 continua intacta — nada muda o passado).
 */
export async function saveEstimatedThresholds(
  supabase: SupabaseClient,
  userId: string,
  activities: PreparedActivityForEstimation[],
  effectiveFrom: string
): Promise<void> {
  const estimates = estimateThresholds(activities)
  if (estimates.length === 0) return

  await supabase.from("athlete_thresholds").upsert(
    estimates.map((estimate) => ({
      user_id: userId,
      sport: estimate.sport,
      metric: estimate.metric,
      value: estimate.value,
      effective_from: effectiveFrom,
      source: "data_estimate",
    })),
    { onConflict: "user_id,sport,metric,effective_from" }
  )
}
