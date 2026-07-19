import { describe, expect, it } from "vitest"

import { extractExtraMetrics } from "@/lib/garmin/extra-metrics"
import type { FitSession } from "@/lib/garmin/fit-parser"

describe("extractExtraMetrics", () => {
  it("retorna vazio quando não há sessão", () => {
    expect(extractExtraMetrics(undefined)).toEqual({})
  })

  it("só inclui os campos presentes na sessão", () => {
    const session = {
      total_calories: 450,
      avg_stroke_count: 12,
    } as FitSession

    expect(extractExtraMetrics(session)).toEqual({
      calories: 450,
      avg_stroke_count: 12,
    })
  })

  it("inclui campos de natação quando presentes", () => {
    const session = {
      pool_length: 25,
      swim_stroke: "freestyle",
    } as FitSession

    expect(extractExtraMetrics(session)).toEqual({
      pool_length_m: 25,
      swim_stroke: "freestyle",
    })
  })
})
