import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/db/server"

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims.email as string | undefined

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Bem-vindo ao The Coach</h1>
          <p className="text-muted-foreground">Logado como {email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </div>
    </div>
  )
}
