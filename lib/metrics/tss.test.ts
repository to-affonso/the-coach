import { describe, expect, it } from "vitest"

import { tssFromIntensityFactor } from "@/lib/metrics/tss"

describe("tssFromIntensityFactor", () => {
  it("1h com IF = 1 (no limiar) = 100 TSS", () => {
    expect(tssFromIntensityFactor(3600, 1)).toBe(100)
  })

  it("30min com IF = 1 = 50 TSS", () => {
    expect(tssFromIntensityFactor(1800, 1)).toBe(50)
  })

  it("1h com IF = 0.5 = 25 TSS (escala com o quadrado do IF)", () => {
    expect(tssFromIntensityFactor(3600, 0.5)).toBe(25)
  })
})
