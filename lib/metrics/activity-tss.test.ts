import { describe, expect, it } from "vitest"

import { computeActivityTss } from "@/lib/metrics/activity-tss"

describe("computeActivityTss", () => {
  it("bike com potência e FTP: usa NP/IF de potência (1h no FTP = 100 TSS)", () => {
    const result = computeActivityTss({
      sport: "bike",
      durationSec: 3600,
      sampleIntervalSec: 1,
      powerStream: Array(3600).fill(200),
      thresholds: { ftp: 200, lthr: 165 },
    })
    expect(result.tss).toBeCloseTo(100, 6)
    expect(result.intensityFactor).toBeCloseTo(1, 6)
    expect(result.thresholdSnapshot).toEqual({ ftp: 200 })
  })

  it("run com pace e pace limiar: usa TSS por pace (1h no pace limiar = 100 TSS)", () => {
    const result = computeActivityTss({
      sport: "run",
      durationSec: 3600,
      sampleIntervalSec: 1,
      avgPaceSecPerUnit: 300,
      thresholds: { threshold_pace: 300, lthr: 165 },
    })
    expect(result.tss).toBeCloseTo(100, 6)
    expect(result.thresholdSnapshot).toEqual({ threshold_pace: 300 })
  })

  it("swim com pace e CSS: usa TSS por pace", () => {
    const result = computeActivityTss({
      sport: "swim",
      durationSec: 3600,
      sampleIntervalSec: 1,
      avgPaceSecPerUnit: 100,
      thresholds: { css: 100 },
    })
    expect(result.tss).toBeCloseTo(100, 6)
    expect(result.thresholdSnapshot).toEqual({ css: 100 })
  })

  it("bike sem potência mas com FC e LTHR: cai para hrTSS via stream", () => {
    const result = computeActivityTss({
      sport: "bike",
      durationSec: 3600,
      sampleIntervalSec: 1,
      hrStream: Array(3600).fill(165),
      thresholds: { ftp: undefined, lthr: 165 },
    })
    expect(result.tss).toBeCloseTo(100, 6)
    expect(result.thresholdSnapshot).toEqual({ lthr: 165 })
  })

  it("strength com FC média (sem stream) e LTHR: usa hrTSS por média", () => {
    const result = computeActivityTss({
      sport: "strength",
      durationSec: 3600,
      sampleIntervalSec: 1,
      avgHr: 165,
      thresholds: { lthr: 165 },
    })
    expect(result.tss).toBeCloseTo(100, 6)
    expect(result.thresholdSnapshot).toEqual({ lthr: 165 })
  })

  it("strength sem FC nem limiar nenhum: cai no fallback fixo de 40/h", () => {
    const result = computeActivityTss({
      sport: "strength",
      durationSec: 3600,
      sampleIntervalSec: 1,
      thresholds: {},
    })
    expect(result.tss).toBe(40)
    expect(result.intensityFactor).toBeNull()
    expect(result.thresholdSnapshot).toEqual({ fixed_fallback_tss_per_hour: 40 })
  })

  it("run sem pace nem FC: cai no fallback fixo mesmo sendo corrida", () => {
    const result = computeActivityTss({
      sport: "run",
      durationSec: 1800,
      sampleIntervalSec: 1,
      thresholds: { threshold_pace: 300 },
    })
    expect(result.tss).toBe(20)
  })
})
