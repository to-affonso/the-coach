import { describe, expect, it } from "vitest"

import { mapGarminSportType } from "@/lib/garmin/sport-mapping"

describe("mapGarminSportType", () => {
  it.each([
    ["street_running", "run"],
    ["trail_running", "run"],
    ["treadmill_running", "run"],
    ["indoor_running", "run"],
    ["cycling", "bike"],
    ["road_biking", "bike"],
    ["mountain_biking", "bike"],
    ["indoor_cycling", "bike"],
    ["virtual_ride", "bike"],
    ["lap_swimming", "swim"],
    ["open_water_swimming", "swim"],
    ["strength_training", "strength"],
    ["cardio_training", "strength"],
    ["fitness_equipment", "strength"],
  ] as const)("mapeia %s -> %s", (garminType, expected) => {
    expect(mapGarminSportType(garminType)).toBe(expected)
  })

  it.each(["golf", "hiking", "walking", "yoga", "skiing", "multi_sport", "other"])(
    "retorna null para %s (fora do vocabulário do app)",
    (garminType) => {
      expect(mapGarminSportType(garminType)).toBeNull()
    }
  )
})
