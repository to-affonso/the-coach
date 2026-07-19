/**
 * Núcleo comum de TSS: horas × IF² × 100. Vale para qualquer esporte/fonte —
 * a única coisa que muda entre potência, pace e FC é como o IF é calculado.
 * Canônico: 1h com IF = 1 (exatamente no limiar) = 100 TSS.
 */
export function tssFromIntensityFactor(
  durationSec: number,
  intensityFactor: number
): number {
  return (durationSec / 3600) * intensityFactor ** 2 * 100
}
