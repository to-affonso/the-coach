import { describe, expect, it } from "vitest"

import { computeHrZones } from "@/lib/metrics/zones"
import { computeTimeInZones } from "@/lib/metrics/time-in-zones"

describe("computeTimeInZones", () => {
  it("soma segundos por zona para uma stream de FC conhecida (LTHR = 170)", () => {
    const zones = computeHrZones(170) // Z1 <138 · Z2 138-151 · Z3 153-158 · Z4 160-168 · Z5 >=170
    // 3 amostras a 5s cada: uma em Z1 (120), uma em Z2 (145), uma em Z5 (175).
    const values = [120, 145, 175]

    expect(computeTimeInZones(values, 5, zones)).toEqual([5, 5, 0, 0, 5])
  })

  it("ignora amostras undefined", () => {
    const zones = computeHrZones(170)
    expect(computeTimeInZones([120, undefined, 120], 5, zones)).toEqual([
      10, 0, 0, 0, 0,
    ])
  })

  it("retorna zero em todas as zonas para stream vazia", () => {
    const zones = computeHrZones(170)
    expect(computeTimeInZones([], 5, zones)).toEqual([0, 0, 0, 0, 0])
  })
})
