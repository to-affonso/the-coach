import { GarminConnection } from "@/components/perfil/garmin-connection"
import { PersonalDataForm } from "@/components/perfil/personal-data-form"
import type {
  Metric,
  Sport,
  ThresholdEntry,
} from "@/components/perfil/sport-thresholds"
import { SportThresholds } from "@/components/perfil/sport-thresholds"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/db/server"

// Seção 4 (atalho de plano ativo) chega junto da página Plano (Fase 3).
// Seções 1-3 (dados do atleta, limiares e zonas, conexão Garmin) e Conta são
// reais desde a 1.5/2.2/1.3.
export default async function PerfilPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims.email as string | undefined
  const userId = data?.claims.sub as string

  const [{ data: profile }, { data: thresholdRows }, { data: garminConnection }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, birth_date, sex, weight_kg, timezone")
        .eq("id", userId)
        .single(),
      supabase
        .from("athlete_thresholds")
        .select("sport, metric, value, effective_from, source")
        .eq("user_id", userId)
        .order("effective_from", { ascending: false }),
      supabase
        .from("garmin_connections")
        .select("status, last_error, last_sync_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

  // Uma linha por (esporte, métrica): a mais recente por effective_from
  // (já vem ordenado desc, então a primeira ocorrência de cada chave vence).
  const bySport: Record<Sport, Partial<Record<Metric, ThresholdEntry>>> = {
    swim: {},
    bike: {},
    run: {},
  }
  for (const row of thresholdRows ?? []) {
    const sport = row.sport as Sport
    const metric = row.metric as Metric
    if (!bySport[sport][metric]) {
      bySport[sport][metric] = {
        value: row.value,
        effective_from: row.effective_from,
        source: row.source,
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <section className="space-y-4">
        <h2 className="font-semibold">Dados do atleta</h2>
        <PersonalDataForm
          profile={
            profile ?? {
              display_name: null,
              birth_date: null,
              sex: null,
              weight_kg: null,
              timezone: null,
            }
          }
        />
      </section>

      <Separator />

      <section className="space-y-6">
        <h2 className="font-semibold">Limiares e zonas</h2>
        <SportThresholds sport="bike" thresholds={bySport.bike} />
        <Separator />
        <SportThresholds sport="run" thresholds={bySport.run} />
        <Separator />
        <SportThresholds sport="swim" thresholds={bySport.swim} />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-semibold">Conexão Garmin</h2>
        <GarminConnection connection={garminConnection} />
      </section>

      <Separator />

      <section className="space-y-1">
        <h2 className="font-semibold">Plano ativo</h2>
        <p className="text-sm text-muted-foreground">Em breve.</p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold">Conta</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </section>
    </div>
  )
}
