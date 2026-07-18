import { NextResponse } from "next/server"

import { createClient } from "@/lib/db/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("health_check")

  if (error || data !== true) {
    return NextResponse.json(
      { status: "error", message: error?.message ?? "resposta inesperada" },
      { status: 503 }
    )
  }

  return NextResponse.json({ status: "ok" })
}
