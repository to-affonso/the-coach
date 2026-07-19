import { describe, expect, it } from "vitest"

import { toIsoUtc } from "@/lib/garmin/format"

describe("toIsoUtc", () => {
  it("converte o timestamp GMT do Garmin (sem tz) para ISO UTC", () => {
    expect(toIsoUtc("2026-07-19 08:23:08")).toBe("2026-07-19T08:23:08.000Z")
  })
})
