import {
  computeHrTssFromAverage,
  computeHrTssFromStream,
} from "@/lib/metrics/hr-tss"
import { computePaceIntensityFactor } from "@/lib/metrics/pace"
import {
  computeNormalizedPower,
  computePowerIntensityFactor,
} from "@/lib/metrics/power"
import { computeStrengthTssFallback } from "@/lib/metrics/strength"
import { tssFromIntensityFactor } from "@/lib/metrics/tss"

export type ActivitySport = "swim" | "bike" | "run" | "strength"

export interface AvailableThresholds {
  ftp?: number
  threshold_pace?: number
  css?: number
  lthr?: number
  max_hr?: number
}

export interface ActivityTssInput {
  sport: ActivitySport
  durationSec: number
  sampleIntervalSec: number
  powerStream?: number[]
  hrStream?: number[]
  /** Pace média (s/km para corrida, s/100m para natação) — distância/duração, sem NP. */
  avgPaceSecPerUnit?: number
  avgHr?: number
  thresholds: AvailableThresholds
}

export interface ActivityTssResult {
  tss: number
  intensityFactor: number | null
  thresholdSnapshot: Record<string, number | string>
}

/**
 * Decide qual fórmula usar conforme a disponibilidade real de dados —
 * potência/pace confiável > hrTSS > fallback fixo — regra geral do
 * modelo de dados ("Decisões de cálculo"), generalizada para qualquer
 * esporte, não só força. Congela o limiar usado em thresholdSnapshot
 * (rule 6: TSS é imutável, o limiar vigente na data fica congelado).
 */
export function computeActivityTss(
  input: ActivityTssInput
): ActivityTssResult {
  const { sport, durationSec, sampleIntervalSec, thresholds } = input

  if (
    sport === "bike" &&
    input.powerStream &&
    input.powerStream.length > 0 &&
    thresholds.ftp
  ) {
    const normalizedPower = computeNormalizedPower(
      input.powerStream,
      sampleIntervalSec
    )
    const intensityFactor = computePowerIntensityFactor(
      normalizedPower,
      thresholds.ftp
    )
    return {
      tss: tssFromIntensityFactor(durationSec, intensityFactor),
      intensityFactor,
      thresholdSnapshot: { ftp: thresholds.ftp },
    }
  }

  if (sport === "run" && input.avgPaceSecPerUnit && thresholds.threshold_pace) {
    const intensityFactor = computePaceIntensityFactor(
      input.avgPaceSecPerUnit,
      thresholds.threshold_pace
    )
    return {
      tss: tssFromIntensityFactor(durationSec, intensityFactor),
      intensityFactor,
      thresholdSnapshot: { threshold_pace: thresholds.threshold_pace },
    }
  }

  if (sport === "swim" && input.avgPaceSecPerUnit && thresholds.css) {
    const intensityFactor = computePaceIntensityFactor(
      input.avgPaceSecPerUnit,
      thresholds.css
    )
    return {
      tss: tssFromIntensityFactor(durationSec, intensityFactor),
      intensityFactor,
      thresholdSnapshot: { css: thresholds.css },
    }
  }

  if (input.hrStream && input.hrStream.length > 0 && thresholds.lthr) {
    const tss = computeHrTssFromStream(
      input.hrStream,
      sampleIntervalSec,
      thresholds.lthr
    )
    return {
      tss,
      // IF "efetivo" equivalente, só para exibição — hrTSS integra no tempo,
      // não tem um IF único real como potência/pace.
      intensityFactor: Math.sqrt(tss / ((durationSec / 3600) * 100)),
      thresholdSnapshot: { lthr: thresholds.lthr },
    }
  }

  if (input.avgHr && thresholds.lthr) {
    const tss = computeHrTssFromAverage(
      input.avgHr,
      durationSec,
      thresholds.lthr
    )
    return {
      tss,
      intensityFactor: input.avgHr / thresholds.lthr,
      thresholdSnapshot: { lthr: thresholds.lthr },
    }
  }

  return {
    tss: computeStrengthTssFallback(durationSec),
    intensityFactor: null,
    thresholdSnapshot: { fixed_fallback_tss_per_hour: 40 },
  }
}
