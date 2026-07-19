import { tssFromIntensityFactor } from "@/lib/metrics/tss"

const ROLLING_WINDOW_SEC = 30

/**
 * Normalized Power (algoritmo Coggan padrão): média móvel de 30s da potência,
 * elevada à 4ª potência, média dessas, raiz 4ª do resultado. Pondera picos de
 * esforço mais que uma média simples (desigualdade de Jensen: NP ≥ média).
 */
export function computeNormalizedPower(
  wattsSeries: number[],
  sampleIntervalSec: number
): number {
  if (wattsSeries.length === 0) return 0

  const windowSamples = Math.min(
    wattsSeries.length,
    Math.max(1, Math.round(ROLLING_WINDOW_SEC / sampleIntervalSec))
  )

  const rollingAverages: number[] = []
  for (let i = 0; i <= wattsSeries.length - windowSamples; i++) {
    const window = wattsSeries.slice(i, i + windowSamples)
    const avg = window.reduce((sum, w) => sum + w, 0) / window.length
    rollingAverages.push(avg)
  }

  const fourthPowerMean =
    rollingAverages.reduce((sum, avg) => sum + avg ** 4, 0) /
    rollingAverages.length

  return fourthPowerMean ** 0.25
}

/** IF de potência: quão perto do FTP foi o esforço (NP / FTP). */
export function computePowerIntensityFactor(
  normalizedPower: number,
  ftp: number
): number {
  return normalizedPower / ftp
}

export function computeBikeTss(
  durationSec: number,
  normalizedPower: number,
  ftp: number
): number {
  const intensityFactor = computePowerIntensityFactor(normalizedPower, ftp)
  return tssFromIntensityFactor(durationSec, intensityFactor)
}
