import { createAdminClient } from "@/lib/db/admin"
import { importHistoricalActivities } from "@/lib/garmin/historical-import"
import { syncUserGarminActivities, type SyncResult } from "@/lib/garmin/sync"

/**
 * Ponto único de entrada do sync: a primeira conexão do usuário
 * (last_sync_at nulo) dispara a importação histórica de 90 dias (2.9); daí
 * em diante, todo sync (2.6 sync-on-open, ação manual, cron) é o incremental
 * de rotina. Os dois endpoints de sync (por usuário e cron) chamam só isto,
 * nunca os módulos internos diretamente.
 */
export async function runGarminSync(userId: string): Promise<SyncResult> {
  const supabase = createAdminClient()
  const { data: connection } = await supabase
    .from("garmin_connections")
    .select("last_sync_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (!connection?.last_sync_at) {
    return importHistoricalActivities(userId)
  }

  return syncUserGarminActivities(userId)
}
