import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/db/server"

// Seções 1-4 chegam nas tarefas 1.5 (dados/limiares) e 2.2 (conexão Garmin) e
// no atalho de plano ativo. Conta (seção 5) já é real desde a 1.3.
export default async function PerfilPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims.email as string | undefined

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <section className="space-y-1">
        <h2 className="font-semibold">Dados do atleta</h2>
        <p className="text-sm text-muted-foreground">Em breve.</p>
      </section>

      <Separator />

      <section className="space-y-1">
        <h2 className="font-semibold">Limiares e zonas</h2>
        <p className="text-sm text-muted-foreground">Em breve.</p>
      </section>

      <Separator />

      <section className="space-y-1">
        <h2 className="font-semibold">Conexão Garmin</h2>
        <p className="text-sm text-muted-foreground">Em breve.</p>
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
