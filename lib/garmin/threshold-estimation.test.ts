import { describe, expect, it } from "vitest"

import type { FitRecord } from "@/lib/garmin/fit-parser"
import {
  estimateThresholds,
  type PreparedActivityForEstimation,
} from "@/lib/garmin/threshold-estimation"

function recordsOf(
  count: number,
  field: "power" | "heart_rate" | "speed",
  value: number
): FitRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(2026, 0, 1, 0, 0, i),
    [field]: value,
  }))
}

describe("estimateThresholds", () => {
  it("estima FTP como 95% da melhor potência sustentada de 20min", () => {
    const activities: PreparedActivityForEstimation[] = [
      { sport: "bike", records: recordsOf(30 * 60, "power", 250) },
    ]
    const estimates = estimateThresholds(activities)
    expect(estimates).toContainEqual({ sport: "bike", metric: "ftp", value: 238 }) // 250*0.95
  })

  it("estima threshold_pace (s/km) a partir da melhor velocidade sustentada de 20min", () => {
    // 3.5 m/s por 25min -> 1000/3.5 ≈ 286 s/km
    const activities: PreparedActivityForEstimation[] = [
      { sport: "run", records: recordsOf(25 * 60, "speed", 3.5) },
    ]
    const estimates = estimateThresholds(activities)
    expect(estimates).toContainEqual({
      sport: "run",
      metric: "threshold_pace",
      value: Math.round(1000 / 3.5),
    })
  })

  it("estima CSS (s/100m) a partir da melhor velocidade sustentada de 15min", () => {
    const activities: PreparedActivityForEstimation[] = [
      { sport: "swim", records: recordsOf(16 * 60, "speed", 1.2) },
    ]
    const estimates = estimateThresholds(activities)
    expect(estimates).toContainEqual({
      sport: "swim",
      metric: "css",
      value: Math.round(100 / 1.2),
    })
  })

  it("estima LTHR por esporte a partir da melhor FC sustentada de 20min", () => {
    const activities: PreparedActivityForEstimation[] = [
      { sport: "bike", records: recordsOf(25 * 60, "heart_rate", 165) },
      { sport: "run", records: recordsOf(25 * 60, "heart_rate", 172) },
    ]
    const estimates = estimateThresholds(activities)
    expect(estimates).toContainEqual({ sport: "bike", metric: "lthr", value: 165 })
    expect(estimates).toContainEqual({ sport: "run", metric: "lthr", value: 172 })
  })

  it("pula esporte/métrica sem dado suficiente (janela maior que o histórico)", () => {
    const activities: PreparedActivityForEstimation[] = [
      { sport: "bike", records: recordsOf(5 * 60, "power", 250) }, // só 5min
    ]
    const estimates = estimateThresholds(activities)
    expect(estimates.find((e) => e.sport === "bike" && e.metric === "ftp")).toBeUndefined()
  })

  it("usa o melhor esforço entre várias atividades do mesmo esporte, não a última", () => {
    const activities: PreparedActivityForEstimation[] = [
      { sport: "bike", records: recordsOf(25 * 60, "power", 200) },
      { sport: "bike", records: recordsOf(25 * 60, "power", 260) },
    ]
    const estimates = estimateThresholds(activities)
    expect(estimates).toContainEqual({
      sport: "bike",
      metric: "ftp",
      value: Math.round(260 * 0.95),
    })
  })

  it("retorna vazio sem nenhuma atividade", () => {
    expect(estimateThresholds([])).toEqual([])
  })
})
