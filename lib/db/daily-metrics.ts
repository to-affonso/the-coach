import type { SupabaseClient } from "@supabase/supabase-js"

import { buildDailyTssSeries, toLocalDateString } from "@/lib/metrics/daily-tss"
import { computePmcSeries } from "@/lib/metrics/pmc"

/**
 * Recalcula `daily_metrics` de `fromTimestamp` em diante (rule 7: atividade
 * passada mudada/inserida dispara recálculo em cascata). O CTL/ATL de
 * partida vem do último dia já calculado antes de `fromTimestamp` — dias
 * anteriores não mudam, então não precisam ser reprocessados. Sem histórico
 * prévio (primeiro sync do usuário), a partida é 0/0.
 */
export async function recalculateDailyMetricsFrom(
  supabase: SupabaseClient,
  userId: string,
  fromTimestamp: string
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single()
  const timezone = profile?.timezone ?? "UTC"

  const fromDate = toLocalDateString(fromTimestamp, timezone)
  const todayLocal = toLocalDateString(new Date().toISOString(), timezone)
  const toDate = fromDate > todayLocal ? fromDate : todayLocal

  const { data: seedRow } = await supabase
    .from("daily_metrics")
    .select("ctl, atl")
    .eq("user_id", userId)
    .lt("date", fromDate)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()

  const seedCtl = seedRow?.ctl ?? 0
  const seedAtl = seedRow?.atl ?? 0

  // Folga de 1 dia no filtro UTC: um timezone à frente do UTC pode ter o
  // dia local `fromDate` começando ainda no dia UTC anterior.
  const utcLowerBound = new Date(`${fromDate}T00:00:00Z`)
  utcLowerBound.setUTCDate(utcLowerBound.getUTCDate() - 1)

  const { data: activities } = await supabase
    .from("activities")
    .select("start_time, tss")
    .eq("user_id", userId)
    .gte("start_time", utcLowerBound.toISOString())

  const activityTss = (activities ?? [])
    .map((activity) => ({
      localDate: toLocalDateString(activity.start_time, timezone),
      tss: activity.tss ?? 0,
    }))
    .filter((activity) => activity.localDate >= fromDate)

  const dailyTss = buildDailyTssSeries(activityTss, fromDate, toDate)
  const pmcSeries = computePmcSeries(dailyTss, seedCtl, seedAtl)

  await supabase.from("daily_metrics").upsert(
    pmcSeries.map((point) => ({
      user_id: userId,
      date: point.date,
      tss_total: point.tss,
      ctl: point.ctl,
      atl: point.atl,
      tsb: point.tsb,
    })),
    { onConflict: "user_id,date" }
  )
}
