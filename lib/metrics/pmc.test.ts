import { describe, expect, it } from "vitest"

import { computePmcSeries } from "@/lib/metrics/pmc"

describe("computePmcSeries", () => {
  it("calcula CTL/ATL/TSB de uma sequência conhecida (3 dias de 100 TSS, partindo de zero)", () => {
    const series = computePmcSeries([
      { date: "2026-01-01", tss: 100 },
      { date: "2026-01-02", tss: 100 },
      { date: "2026-01-03", tss: 100 },
    ])

    expect(series).toHaveLength(3)

    expect(series[0].tsb).toBe(0)
    expect(series[0].ctl).toBeCloseTo(2.380952, 6)
    expect(series[0].atl).toBeCloseTo(14.285714, 6)

    expect(series[1].tsb).toBeCloseTo(-11.904762, 6)
    expect(series[1].ctl).toBeCloseTo(4.705215, 6)
    expect(series[1].atl).toBeCloseTo(26.530612, 6)

    expect(series[2].tsb).toBeCloseTo(-21.825397, 6)
    expect(series[2].ctl).toBeCloseTo(6.974139, 6)
    expect(series[2].atl).toBeCloseTo(37.026239, 6)
  })

  it("dia de descanso (tss: 0) reduz ATL mais rápido que CTL (fadiga cai antes da forma)", () => {
    const series = computePmcSeries(
      [{ date: "2026-01-01", tss: 0 }],
      50,
      50
    )
    expect(series[0].ctl).toBeLessThan(50)
    expect(series[0].atl).toBeLessThan(series[0].ctl)
  })

  it("mantém CTL/ATL constantes quando o TSS diário se repete no valor de equilíbrio", () => {
    // Em equilíbrio (TSS = CTL = ATL), a fórmula não move os valores.
    const series = computePmcSeries(
      [
        { date: "2026-01-01", tss: 60 },
        { date: "2026-01-02", tss: 60 },
      ],
      60,
      60
    )
    expect(series[0].ctl).toBeCloseTo(60, 9)
    expect(series[0].atl).toBeCloseTo(60, 9)
    expect(series[1].ctl).toBeCloseTo(60, 9)
    expect(series[1].atl).toBeCloseTo(60, 9)
  })
})
