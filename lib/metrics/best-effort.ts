/**
 * Melhor média sustentada de `windowMinutes` dentro de uma série (potência,
 * velocidade ou FC) via janela deslizante — mesmo princípio da normalized
 * power (rolling window), mas média simples, não elevada à 4ª potência.
 * Usada para estimar limiares (FTP, threshold_pace, CSS, LTHR) a partir dos
 * melhores esforços do histórico importado (source='data_estimate').
 * `null` quando a série é mais curta que a janela (dado insuficiente).
 */
export function computeBestSustainedAverage(
  series: number[],
  sampleIntervalSec: number,
  windowMinutes: number
): number | null {
  const windowSamples = Math.round((windowMinutes * 60) / sampleIntervalSec)
  if (windowSamples <= 0 || series.length < windowSamples) return null

  let windowSum = 0
  for (let i = 0; i < windowSamples; i++) windowSum += series[i]

  let best = windowSum / windowSamples
  for (let i = windowSamples; i < series.length; i++) {
    windowSum += series[i] - series[i - windowSamples]
    best = Math.max(best, windowSum / windowSamples)
  }

  return best
}
