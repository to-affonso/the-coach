import { describe, expect, it } from "vitest"

import {
  computeBikeTss,
  computeNormalizedPower,
  computePowerIntensityFactor,
} from "@/lib/metrics/power"

describe("computeNormalizedPower", () => {
  it("de uma série constante, é igual à própria potência", () => {
    const constant = Array(3600).fill(250)
    expect(computeNormalizedPower(constant, 1)).toBeCloseTo(250, 6)
  })

  it("de [100, 300] com janela degenerada de 1 amostra, é a média de 4ª potência", () => {
    // sampleIntervalSec = 30 → janela de 30/30 = 1 amostra: a "média móvel"
    // vira cada amostra individual, então NP = ((100^4 + 300^4)/2)^(1/4).
    expect(computeNormalizedPower([100, 300], 30)).toBeCloseTo(253.044, 3)
  })

  it("é maior que a média simples quando há variabilidade (desigualdade de Jensen)", () => {
    const series = [100, 300]
    const np = computeNormalizedPower(series, 30)
    const avg = (100 + 300) / 2
    expect(np).toBeGreaterThan(avg)
  })
})

describe("computePowerIntensityFactor", () => {
  it("NP igual ao FTP dá IF = 1", () => {
    expect(computePowerIntensityFactor(200, 200)).toBe(1)
  })
})

describe("computeBikeTss", () => {
  it("1h constante exatamente no FTP = 100 TSS (teste canônico do projeto)", () => {
    const oneHourAtFtp = Array(3600).fill(200)
    const np = computeNormalizedPower(oneHourAtFtp, 1)
    expect(computeBikeTss(3600, np, 200)).toBeCloseTo(100, 6)
  })

  it("1h a 50% do FTP = 25 TSS", () => {
    const oneHourAtHalfFtp = Array(3600).fill(100)
    const np = computeNormalizedPower(oneHourAtHalfFtp, 1)
    expect(computeBikeTss(3600, np, 200)).toBeCloseTo(25, 6)
  })
})
