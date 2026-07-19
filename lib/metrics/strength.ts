/** Fallback fixo para força sem dados de FC: 40 TSS por hora, proporcional à duração. */
export function computeStrengthTssFallback(durationSec: number): number {
  return (durationSec / 3600) * 40
}
