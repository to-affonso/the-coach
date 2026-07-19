import { describe, expect, it } from "vitest"

import { computeBestSustainedAverage } from "@/lib/metrics/best-effort"

describe("computeBestSustainedAverage", () => {
  it("retorna a média exata quando a série tem o tamanho exato da janela", () => {
    const series = Array(1200).fill(200) // 20min a 1s
    expect(computeBestSustainedAverage(series, 1, 20)).toBe(200)
  })

  it("null quando a série é mais curta que a janela (dado insuficiente)", () => {
    const series = Array(600).fill(200) // 10min a 1s, janela pede 20min
    expect(computeBestSustainedAverage(series, 1, 20)).toBeNull()
  })

  it("encontra o melhor trecho sustentado, não a média geral da série", () => {
    // 10min fracos (100W) + 20min fortes (300W) + 10min fracos (100W).
    const series = [
      ...Array(600).fill(100),
      ...Array(1200).fill(300),
      ...Array(600).fill(100),
    ]
    expect(computeBestSustainedAverage(series, 1, 20)).toBe(300)
  })

  it("um pico curto não domina a janela de 20min (não é só o máximo pontual)", () => {
    const series = [...Array(50).fill(1000), ...Array(1200).fill(150)]
    const result = computeBestSustainedAverage(series, 1, 20)!
    expect(result).toBeLessThan(1000)
    expect(result).toBeGreaterThan(150)
  })

  it("respeita sampleIntervalSec diferente de 1 (ex.: stream reamostrada a 5s)", () => {
    const windowSamples = (20 * 60) / 5 // 240 amostras de 5s = 20min
    const series = Array(windowSamples).fill(250)
    expect(computeBestSustainedAverage(series, 5, 20)).toBe(250)
  })
})
