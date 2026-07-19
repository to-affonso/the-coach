import { tssFromIntensityFactor } from "@/lib/metrics/tss"

const MIN_VALID_HR_BPM = 30
const MAX_VALID_HR_BPM = 230

function filterValidHr(hrSamples: number[]): number[] {
  return hrSamples.filter(
    (hr) => hr >= MIN_VALID_HR_BPM && hr <= MAX_VALID_HR_BPM
  )
}

/**
 * hrTSS integrado sobre a stream de FC: Σ(Δt × (FC_i/LTHR)²) × 100/3600.
 * Generaliza o TSS = horas × IF² × 100 continuamente no tempo, em vez de
 * aplicar o IF uma única vez sobre a FC média — por isso capta variabilidade
 * (um treino intervalado pontua mais aqui do que pela FC média equivalente).
 * Amostras fora de 30–230 bpm (glitch de sensor) são descartadas antes.
 */
export function computeHrTssFromStream(
  hrSamples: number[],
  sampleIntervalSec: number,
  lthr: number
): number {
  const validSamples = filterValidHr(hrSamples)
  const sumSquaredIf = validSamples.reduce(
    (sum, hr) => sum + (hr / lthr) ** 2,
    0
  )
  return (sumSquaredIf * sampleIntervalSec * 100) / 3600
}

/** Fallback sem stream: aplica o IF uma vez sobre a FC média do treino inteiro. */
export function computeHrTssFromAverage(
  avgHr: number,
  durationSec: number,
  lthr: number
): number {
  const intensityFactor = avgHr / lthr
  return tssFromIntensityFactor(durationSec, intensityFactor)
}
