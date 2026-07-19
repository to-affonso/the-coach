import type { SupabaseClient } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { recalculateDailyMetricsFrom } from "@/lib/db/daily-metrics"
import { buildDailyTssSeries } from "@/lib/metrics/daily-tss"
import { computePmcSeries } from "@/lib/metrics/pmc"

interface FakeConfig {
  timezone: string | null
  seedRow: { date: string; ctl: number; atl: number } | null
  activities: Array<{ start_time: string; tss: number }>
}

/** Fake mínimo do client, cobrindo só a cadeia de chamadas que daily-metrics.ts usa. */
function createFakeSupabase(config: FakeConfig) {
  const upsertedRows: unknown[] = []

  const client = {
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { timezone: config.timezone } }),
            }),
          }),
        }
      }
      if (table === "activities") {
        return {
          select: () => ({
            eq: () => ({
              gte: async () => ({ data: config.activities }),
            }),
          }),
        }
      }
      if (table === "daily_metrics") {
        return {
          select: () => ({
            eq: () => ({
              lt: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: config.seedRow }),
                  }),
                }),
              }),
            }),
          }),
          upsert: async (rows: unknown[]) => {
            upsertedRows.push(...rows)
            return { data: rows, error: null }
          },
        }
      }
      throw new Error(`tabela inesperada no fake: ${table}`)
    },
  }

  return { client: client as unknown as SupabaseClient, upsertedRows }
}

describe("recalculateDailyMetricsFrom", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-05T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("recalcula em cascata a partir de uma atividade retroativa, usando o CTL/ATL do dia anterior como partida", async () => {
    const { client, upsertedRows } = createFakeSupabase({
      timezone: "UTC",
      seedRow: { date: "2026-01-02", ctl: 10, atl: 10 },
      activities: [{ start_time: "2026-01-03T10:00:00Z", tss: 50 }],
    })

    await recalculateDailyMetricsFrom(client, "user-1", "2026-01-03T10:00:00Z")

    const expectedSeries = computePmcSeries(
      buildDailyTssSeries(
        [{ localDate: "2026-01-03", tss: 50 }],
        "2026-01-03",
        "2026-01-05"
      ),
      10,
      10
    )

    expect(upsertedRows).toEqual(
      expectedSeries.map((point) => ({
        user_id: "user-1",
        date: point.date,
        tss_total: point.tss,
        ctl: point.ctl,
        atl: point.atl,
        tsb: point.tsb,
      }))
    )
    // A cascata cobre do dia retroativo até hoje — nunca reprocessa antes dele.
    expect(upsertedRows).toHaveLength(3)
    expect(upsertedRows[0]).toMatchObject({ date: "2026-01-03" })
    expect(upsertedRows[2]).toMatchObject({ date: "2026-01-05" })
  })

  it("usa CTL/ATL zero quando não há daily_metrics anterior (primeiro sync do usuário)", async () => {
    const { client, upsertedRows } = createFakeSupabase({
      timezone: "UTC",
      seedRow: null,
      activities: [{ start_time: "2026-01-05T08:00:00Z", tss: 80 }],
    })

    await recalculateDailyMetricsFrom(client, "user-1", "2026-01-05T08:00:00Z")

    expect(upsertedRows).toHaveLength(1)
    expect(upsertedRows[0]).toMatchObject({
      date: "2026-01-05",
      tss_total: 80,
      ctl: 80 / 42,
      atl: 80 / 7,
      tsb: 0,
    })
  })
})
