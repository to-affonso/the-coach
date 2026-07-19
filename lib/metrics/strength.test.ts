import { describe, expect, it } from "vitest"

import { computeStrengthTssFallback } from "@/lib/metrics/strength"

describe("computeStrengthTssFallback", () => {
  it("1h = 40 TSS", () => {
    expect(computeStrengthTssFallback(3600)).toBe(40)
  })

  it("30min = 20 TSS", () => {
    expect(computeStrengthTssFallback(1800)).toBe(20)
  })

  it("1h30 = 60 TSS", () => {
    expect(computeStrengthTssFallback(5400)).toBe(60)
  })
})
