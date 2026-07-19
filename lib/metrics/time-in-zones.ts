import type { Zone } from "@/lib/metrics/zones"

/**
 * Tempo (segundos) passado em cada zona, a partir de uma stream (FC ou
 * potência) e das zonas já calculadas (lib/metrics/zones.ts). Amostras
 * `undefined`/fora de todas as zonas (não deveria acontecer com zonas bem
 * formadas, mas defensivo) são ignoradas.
 */
export function computeTimeInZones(
  values: Array<number | undefined>,
  sampleIntervalSec: number,
  zones: Zone[]
): number[] {
  const secondsPerZone = new Array(zones.length).fill(0)

  for (const value of values) {
    if (value === undefined) continue

    const zoneIndex = zones.findIndex(
      (zone) =>
        (zone.min === null || value >= zone.min) &&
        (zone.max === null || value < zone.max)
    )

    if (zoneIndex !== -1) {
      secondsPerZone[zoneIndex] += sampleIntervalSec
    }
  }

  return secondsPerZone
}
