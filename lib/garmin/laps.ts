import type { FitLap } from "@/lib/garmin/fit-parser"

export interface ActivityLap {
  start_time: string
  duration_s?: number
  distance_m?: number
  avg_hr?: number
  max_hr?: number
  avg_power?: number
  avg_speed_mps?: number
}

export function buildActivityLaps(laps: FitLap[]): ActivityLap[] {
  return laps.map((lap) => ({
    start_time: lap.start_time.toISOString(),
    duration_s: lap.total_elapsed_time,
    distance_m: lap.total_distance,
    avg_hr: lap.avg_heart_rate,
    max_hr: lap.max_heart_rate,
    avg_power: lap.avg_power,
    avg_speed_mps: lap.avg_speed,
  }))
}
