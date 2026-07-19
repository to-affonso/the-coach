import { describe, expect, it } from "vitest"

import {
  computeBikePowerZones,
  computeHrZones,
  computeRunPaceZones,
  computeSwimPaceZones,
} from "@/lib/metrics/zones"

describe("computeBikePowerZones", () => {
  it("calcula as 7 zonas de potência para FTP = 200W", () => {
    expect(computeBikePowerZones(200)).toEqual([
      { zone: 1, label: "Recuperação ativa", min: null, max: 110 },
      { zone: 2, label: "Resistência", min: 110, max: 150 },
      { zone: 3, label: "Tempo", min: 152, max: 180 },
      { zone: 4, label: "Limiar", min: 182, max: 210 },
      { zone: 5, label: "VO2max", min: 212, max: 240 },
      { zone: 6, label: "Capacidade anaeróbica", min: 242, max: 300 },
      { zone: 7, label: "Potência neuromuscular", min: 300, max: null },
    ])
  })
})

describe("computeRunPaceZones", () => {
  it("calcula as 5 zonas de pace para limiar de 300 s/km (5:00/km)", () => {
    expect(computeRunPaceZones(300)).toEqual([
      { zone: 1, label: "Recuperação", min: 387, max: null },
      { zone: 2, label: "Resistência", min: 342, max: 387 },
      { zone: 3, label: "Ritmo/Tempo", min: 318, max: 339 },
      { zone: 4, label: "Limiar", min: 300, max: 315 },
      { zone: 5, label: "VO2max", min: null, max: 300 },
    ])
  })
})

describe("computeSwimPaceZones", () => {
  it("calcula as 5 zonas de pace para CSS de 100 s/100m (1:40/100m)", () => {
    expect(computeSwimPaceZones(100)).toEqual([
      { zone: 1, label: "Recuperação", min: 115, max: null },
      { zone: 2, label: "Resistência", min: 106, max: 115 },
      { zone: 3, label: "Ritmo", min: 102, max: 105 },
      { zone: 4, label: "Limiar (CSS)", min: 98, max: 101 },
      { zone: 5, label: "Velocidade", min: null, max: 98 },
    ])
  })
})

describe("computeHrZones", () => {
  it("calcula as 5 zonas de FC para LTHR = 170 bpm", () => {
    expect(computeHrZones(170)).toEqual([
      { zone: 1, label: "Zona 1", min: null, max: 138 },
      { zone: 2, label: "Zona 2", min: 138, max: 151 },
      { zone: 3, label: "Zona 3", min: 153, max: 158 },
      { zone: 4, label: "Zona 4", min: 160, max: 168 },
      { zone: 5, label: "Zona 5", min: 170, max: null },
    ])
  })
})
