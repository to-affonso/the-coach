import type { SupabaseClient } from "@supabase/supabase-js"

import type { AvailableThresholds } from "@/lib/metrics/activity-tss"

/**
 * Limiares vigentes de um esporte na data de uma atividade (rule 6: TSS
 * imutável, calculado com o limiar vigente na data, nunca o mais recente).
 */
export async function fetchVigentThresholds(
  supabase: SupabaseClient,
  userId: string,
  sport: "swim" | "bike" | "run" | "strength",
  asOfDate: Date
): Promise<AvailableThresholds> {
  // strength não tem limiar próprio no modelo — usa o mesmo LTHR/max_hr
  // registrado para outro esporte não faria sentido; força só tem hrTSS via
  // fallback fixo se não houver limiar dedicado. Sem tabela de limiares de
  // força, retornamos vazio (cai direto no fallback fixo).
  if (sport === "strength") return {}

  const { data } = await supabase
    .from("athlete_thresholds")
    .select("metric, value")
    .eq("user_id", userId)
    .eq("sport", sport)
    .lte("effective_from", asOfDate.toISOString().slice(0, 10))
    .order("effective_from", { ascending: false })

  const thresholds: AvailableThresholds = {}
  for (const row of data ?? []) {
    const metric = row.metric as keyof AvailableThresholds
    if (thresholds[metric] === undefined) {
      thresholds[metric] = row.value
    }
  }
  return thresholds
}
