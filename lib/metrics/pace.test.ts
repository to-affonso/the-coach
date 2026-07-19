import { describe, expect, it } from "vitest"

import {
  computePaceIntensityFactor,
  computeRunTss,
  computeSwimTss,
} from "@/lib/metrics/pace"

describe("computePaceIntensityFactor", () => {
  it("pace igual ao limiar dá IF = 1", () => {
    expect(computePaceIntensityFactor(300, 300)).toBe(1)
  })

  it("pace mais rápido que o limiar (menor s/km) dá IF > 1", () => {
    expect(computePaceIntensityFactor(270, 300)).toBeGreaterThan(1)
  })

  it("pace mais lento que o limiar (maior s/km) dá IF < 1", () => {
    expect(computePaceIntensityFactor(330, 300)).toBeLessThan(1)
  })
})

describe("computeRunTss", () => {
  it("1h exatamente no pace limiar = 100 TSS (teste canônico)", () => {
    expect(computeRunTss(3600, 300, 300)).toBeCloseTo(100, 6)
  })
})

describe("computeSwimTss", () => {
  it("1h exatamente no CSS = 100 TSS (teste canônico)", () => {
    expect(computeSwimTss(3600, 100, 100)).toBeCloseTo(100, 6)
  })
})
