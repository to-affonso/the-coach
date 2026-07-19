import { describe, expect, it } from "vitest"

import { buildDailyTssSeries, toLocalDateString } from "@/lib/metrics/daily-tss"

describe("toLocalDateString", () => {
  it("volta para o dia anterior quando o timezone está atrás do UTC", () => {
    // 02:00 UTC de 1º jan em UTC-3 (São Paulo) ainda é 31/dez local.
    expect(
      toLocalDateString("2026-01-01T02:00:00Z", "America/Sao_Paulo")
    ).toBe("2025-12-31")
  })

  it("mantém o mesmo dia quando o timezone é UTC", () => {
    expect(toLocalDateString("2026-01-01T23:00:00Z", "UTC")).toBe(
      "2026-01-01"
    )
  })
})

describe("buildDailyTssSeries", () => {
  it("soma múltiplas atividades no mesmo dia local", () => {
    const series = buildDailyTssSeries(
      [
        { localDate: "2026-01-01", tss: 50 },
        { localDate: "2026-01-01", tss: 30 },
      ],
      "2026-01-01",
      "2026-01-01"
    )
    expect(series).toEqual([{ date: "2026-01-01", tss: 80 }])
  })

  it("preenche dias sem treino com tss zero, sem lacunas", () => {
    const series = buildDailyTssSeries(
      [{ localDate: "2026-01-01", tss: 100 }],
      "2026-01-01",
      "2026-01-03"
    )
    expect(series).toEqual([
      { date: "2026-01-01", tss: 100 },
      { date: "2026-01-02", tss: 0 },
      { date: "2026-01-03", tss: 0 },
    ])
  })

  it("ignora atividades fora do intervalo [fromDate, toDate]", () => {
    const series = buildDailyTssSeries(
      [
        { localDate: "2025-12-31", tss: 999 },
        { localDate: "2026-01-02", tss: 40 },
      ],
      "2026-01-01",
      "2026-01-02"
    )
    expect(series).toEqual([
      { date: "2026-01-01", tss: 0 },
      { date: "2026-01-02", tss: 40 },
    ])
  })
})
