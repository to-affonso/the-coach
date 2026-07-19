import { NextRequest, NextResponse } from "next/server"

import { fetchActivitiesPage } from "@/lib/db/activities"
import { createClient } from "@/lib/db/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const cursor = request.nextUrl.searchParams.get("cursor")
  const page = await fetchActivitiesPage(supabase, claims.sub, cursor)

  return NextResponse.json(page)
}
