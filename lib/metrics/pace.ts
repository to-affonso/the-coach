import { tssFromIntensityFactor } from "@/lib/metrics/tss"

/**
 * IF por pace: pace é inverso de esforço (menor tempo = mais rápido = mais
 * intenso), então a razão se inverte em relação à potência: limiar / real.
 * Mesma unidade nos dois lados (s/km para corrida, s/100m para natação).
 */
export function computePaceIntensityFactor(
  avgPaceSecPerUnit: number,
  thresholdPaceSecPerUnit: number
): number {
  return thresholdPaceSecPerUnit / avgPaceSecPerUnit
}

export function computeRunTss(
  durationSec: number,
  avgPaceSecPerKm: number,
  thresholdPaceSecPerKm: number
): number {
  const intensityFactor = computePaceIntensityFactor(
    avgPaceSecPerKm,
    thresholdPaceSecPerKm
  )
  return tssFromIntensityFactor(durationSec, intensityFactor)
}

export function computeSwimTss(
  durationSec: number,
  avgPaceSecPer100m: number,
  cssSecPer100m: number
): number {
  const intensityFactor = computePaceIntensityFactor(
    avgPaceSecPer100m,
    cssSecPer100m
  )
  return tssFromIntensityFactor(durationSec, intensityFactor)
}
