import { describe, expect, it } from "vitest"

import { buildActivityLaps } from "@/lib/garmin/laps"
import type { FitLap } from "@/lib/garmin/fit-parser"

describe("buildActivityLaps", () => {
  it("mapeia laps do FIT para o formato do app", () => {
    const laps: FitLap[] = [
      {
        start_time: new Date("2026-07-19T08:00:00Z"),
        total_elapsed_time: 600,
        total_distance: 2000,
        avg_heart_rate: 150,
        avg_power: 210,
      },
    ]

    expect(buildActivityLaps(laps)).toEqual([
      {
        start_time: "2026-07-19T08:00:00.000Z",
        duration_s: 600,
        distance_m: 2000,
        avg_hr: 150,
        max_hr: undefined,
        avg_power: 210,
        avg_speed_mps: undefined,
      },
    ])
  })

  it("retorna array vazio quando não há laps", () => {
    expect(buildActivityLaps([])).toEqual([])
  })
})
