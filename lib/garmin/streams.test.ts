import { describe, expect, it } from "vitest"

import { resampleStreams } from "@/lib/garmin/streams"
import type { FitRecord } from "@/lib/garmin/fit-parser"

function record(secondsFromStart: number, fields: Partial<FitRecord> = {}) {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, secondsFromStart)),
    ...fields,
  } as FitRecord
}

describe("resampleStreams", () => {
  it("retorna vazio para lista vazia", () => {
    expect(resampleStreams([])).toEqual({ t: [] })
  })

  it("agrupa 10 registros de 1s em 2 baldes de 5s, com média para FC e último valor para distância", () => {
    const records = [
      record(0, { heart_rate: 100, distance: 0 }),
      record(1, { heart_rate: 110, distance: 3 }),
      record(2, { heart_rate: 120, distance: 6 }),
      record(3, { heart_rate: 130, distance: 9 }),
      record(4, { heart_rate: 140, distance: 12 }),
      record(5, { heart_rate: 150, distance: 15 }),
      record(6, { heart_rate: 150, distance: 18 }),
      record(7, { heart_rate: 150, distance: 21 }),
      record(8, { heart_rate: 150, distance: 24 }),
      record(9, { heart_rate: 150, distance: 27 }),
    ]

    const result = resampleStreams(records, 5)

    expect(result.t).toEqual([0, 5])
    expect(result.hr).toEqual([120, 150]) // média (100+110+120+130+140)/5, e todos 150 no 2º balde
    expect(result.dist).toEqual([12, 27]) // último valor de cada balde
  })

  it("omite canais totalmente ausentes (ex.: atividade indoor sem lat/lng)", () => {
    const records = [record(0, { heart_rate: 100 }), record(1, { heart_rate: 110 })]
    const result = resampleStreams(records, 5)

    expect(result.lat).toBeUndefined()
    expect(result.lng).toBeUndefined()
    expect(result.hr).toBeDefined()
  })
})
