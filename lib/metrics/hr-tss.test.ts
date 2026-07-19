import { describe, expect, it } from "vitest"

import {
  computeHrTssFromAverage,
  computeHrTssFromStream,
} from "@/lib/metrics/hr-tss"

describe("computeHrTssFromAverage", () => {
  it("1h com FC média exatamente no LTHR = 100 (teste canônico)", () => {
    expect(computeHrTssFromAverage(150, 3600, 150)).toBeCloseTo(100, 6)
  })
})

describe("computeHrTssFromStream", () => {
  it("1h com FC constante exatamente no LTHR = 100, igual à via da média", () => {
    const constantAtLthr = Array(3600).fill(150)
    expect(computeHrTssFromStream(constantAtLthr, 1, 150)).toBeCloseTo(100, 6)
  })

  it("descarta amostras fora de 30–230 bpm antes de calcular", () => {
    const withGlitches = [0, 999, ...Array(3600).fill(150), -5, 500]
    expect(computeHrTssFromStream(withGlitches, 1, 150)).toBeCloseTo(100, 6)
  })

  it("treino intervalado (metade Z2, metade Z5) pontua mais pela stream do que pela média equivalente", () => {
    const lthr = 100
    const z2 = 85
    const z5 = 110
    const halfHourEach = 1800

    const stream = [
      ...Array(halfHourEach).fill(z2),
      ...Array(halfHourEach).fill(z5),
    ]
    const streamTss = computeHrTssFromStream(stream, 1, lthr)

    const avgHr = (z2 + z5) / 2
    const averageTss = computeHrTssFromAverage(avgHr, 3600, lthr)

    expect(streamTss).toBeCloseTo(96.625, 3)
    expect(averageTss).toBeCloseTo(95.0625, 4)
    expect(streamTss).toBeGreaterThan(averageTss)
  })
})
