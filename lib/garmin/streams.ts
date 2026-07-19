import type { FitRecord } from "@/lib/garmin/fit-parser"

export interface ResampledStreams {
  t: number[]
  hr?: number[]
  watts?: number[]
  /** Velocidade em m/s (unidade canônica) — pace (min/km) é conversão só de exibição. */
  pace?: number[]
  cad?: number[]
  alt?: number[]
  dist?: number[]
  lat?: number[]
  lng?: number[]
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Agrupa os records nativos do FIT (tipicamente 1s) em baldes de
 * `targetIntervalSec` (padrão 5s). Canais instantâneos (FC, potência,
 * velocidade, cadência, altitude, posição) usam a média do balde; distância
 * é cumulativa, então usa o último valor do balde, não a média.
 */
export function resampleStreams(
  records: FitRecord[],
  targetIntervalSec = 5
): ResampledStreams {
  if (records.length === 0) return { t: [] }

  const startMs = records[0].timestamp.getTime()
  const buckets = new Map<number, FitRecord[]>()

  for (const record of records) {
    const elapsedSec = (record.timestamp.getTime() - startMs) / 1000
    const bucketIndex = Math.floor(elapsedSec / targetIntervalSec)
    const bucket = buckets.get(bucketIndex) ?? []
    bucket.push(record)
    buckets.set(bucketIndex, bucket)
  }

  const sortedBucketIndexes = [...buckets.keys()].sort((a, b) => a - b)

  const streams: ResampledStreams = { t: [] }
  const channels: Record<string, number[]> = {}

  for (const bucketIndex of sortedBucketIndexes) {
    const bucket = buckets.get(bucketIndex)!
    streams.t.push(bucketIndex * targetIntervalSec)

    const push = (channel: string, value: number | undefined) => {
      if (value === undefined) return
      ;(channels[channel] ??= []).push(value)
    }

    const hrs = bucket.map((r) => r.heart_rate).filter((v) => v !== undefined)
    if (hrs.length > 0) push("hr", average(hrs))

    const watts = bucket.map((r) => r.power).filter((v) => v !== undefined)
    if (watts.length > 0) push("watts", average(watts))

    const speeds = bucket.map((r) => r.speed).filter((v) => v !== undefined)
    if (speeds.length > 0) push("pace", average(speeds))

    const cadences = bucket.map((r) => r.cadence).filter((v) => v !== undefined)
    if (cadences.length > 0) push("cad", average(cadences))

    const altitudes = bucket.map((r) => r.altitude).filter((v) => v !== undefined)
    if (altitudes.length > 0) push("alt", average(altitudes))

    const lats = bucket.map((r) => r.position_lat).filter((v) => v !== undefined)
    if (lats.length > 0) push("lat", average(lats))

    const lngs = bucket
      .map((r) => r.position_long)
      .filter((v) => v !== undefined)
    if (lngs.length > 0) push("lng", average(lngs))

    // Distância é cumulativa: pega o último valor do balde, não a média.
    const lastWithDistance = [...bucket]
      .reverse()
      .find((r) => r.distance !== undefined)
    if (lastWithDistance?.distance !== undefined) {
      push("dist", lastWithDistance.distance)
    }
  }

  return { ...streams, ...channels }
}
