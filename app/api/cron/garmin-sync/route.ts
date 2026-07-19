import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/db/admin"
import { syncUserGarminActivities } from "@/lib/garmin/sync"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: connections, error } = await supabase
    .from("garmin_connections")
    .select("user_id")
    .in("status", ["active", "expired", "error"])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    (connections ?? []).map((connection) =>
      syncUserGarminActivities(connection.user_id)
    )
  )

  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed = results.length - succeeded

  return NextResponse.json({ total: results.length, succeeded, failed })
}
