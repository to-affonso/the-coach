import { NextResponse } from "next/server"

import { createClient } from "@/lib/db/server"
import { syncUserGarminActivities } from "@/lib/garmin/sync"

export async function POST() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  try {
    const result = await syncUserGarminActivities(claims.sub)
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido no sync."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
