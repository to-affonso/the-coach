import type { DailyTss } from "@/lib/metrics/pmc"

/**
 * Data local (YYYY-MM-DD) de um instante, no timezone do perfil — a "virada
 * do dia" do PMC (convenção do projeto: UTC no banco, timezone só na borda).
 */
export function toLocalDateString(
  isoTimestamp: string,
  timezone: string
): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date(isoTimestamp)
  )
}

/**
 * Soma TSS por dia local e preenche as lacunas com 0 — computePmcSeries
 * exige uma série contínua (dias sem treino contam com TSS zero, senão o
 * decaimento de CTL/ATL nesses dias nunca é aplicado).
 */
export function buildDailyTssSeries(
  activityTss: Array<{ localDate: string; tss: number }>,
  fromDate: string,
  toDate: string
): DailyTss[] {
  const totals = new Map<string, number>()
  for (const { localDate, tss } of activityTss) {
    totals.set(localDate, (totals.get(localDate) ?? 0) + tss)
  }

  const series: DailyTss[] = []
  const cursor = new Date(`${fromDate}T00:00:00Z`)
  const end = new Date(`${toDate}T00:00:00Z`)

  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10)
    series.push({ date, tss: totals.get(date) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return series
}
