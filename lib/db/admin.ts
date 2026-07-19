import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Cliente com a secret key (bypassa RLS). Uso restrito a operações
 * server-side sem sessão de usuário: motor de sync (endpoint por usuário e
 * cron diário). Nunca importar em código que roda no browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
