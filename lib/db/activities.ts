import type { SupabaseClient } from "@supabase/supabase-js"

export const FEED_PAGE_SIZE = 15

export interface ActivityFeedItem {
  id: string
  sport: string
  name: string | null
  start_time: string
  duration_s: number | null
  distance_m: number | null
  avg_hr: number | null
  avg_power: number | null
  normalized_power: number | null
  avg_cadence: number | null
  avg_speed_mps: number | null
  tss: number | null
  route_polyline: string | null
  /** Só 'completed'/'partial' importam para o badge — outros status não aparecem aqui. */
  matched_status: "completed" | "partial" | null
  insight_headline: string | null
}

export interface ActivitiesPage {
  activities: ActivityFeedItem[]
  nextCursor: string | null
}

const FEED_COLUMNS =
  "id, sport, name, start_time, duration_s, distance_m, avg_hr, avg_power, normalized_power, avg_cadence, avg_speed_mps, tss, route_polyline"

/**
 * Página do Feed, paginada por cursor em `start_time` (ordem cronológica
 * inversa). Badge de vínculo e headline do insight vêm de tabelas próprias
 * (matching e insight-generator ainda não existem no backlog — 3.6 e 4.1 —
 * então essas colunas ficam null na prática até lá, mas o join já é real).
 */
export async function fetchActivitiesPage(
  supabase: SupabaseClient,
  userId: string,
  cursor?: string | null
): Promise<ActivitiesPage> {
  let query = supabase
    .from("activities")
    .select(FEED_COLUMNS)
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1)

  if (cursor) query = query.lt("start_time", cursor)

  const { data: rows } = await query
  const page = rows ?? []
  const hasMore = page.length > FEED_PAGE_SIZE
  const pageRows = hasMore ? page.slice(0, FEED_PAGE_SIZE) : page
  const ids = pageRows.map((row) => row.id)

  const [{ data: matches }, { data: insights }] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("planned_workouts")
          .select("matched_activity_id, status")
          .in("matched_activity_id", ids)
      : Promise.resolve({ data: [] as { matched_activity_id: string; status: string }[] }),
    ids.length > 0
      ? supabase
          .from("activity_insights")
          .select("activity_id, headline, created_at")
          .in("activity_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({
          data: [] as { activity_id: string; headline: string | null }[],
        }),
  ])

  const statusByActivityId = new Map(
    (matches ?? []).map((match) => [match.matched_activity_id, match.status])
  )

  const headlineByActivityId = new Map<string, string>()
  for (const insight of insights ?? []) {
    // Já vem ordenado desc por created_at: a primeira ocorrência de cada id é a mais recente.
    if (!headlineByActivityId.has(insight.activity_id) && insight.headline) {
      headlineByActivityId.set(insight.activity_id, insight.headline)
    }
  }

  const activities: ActivityFeedItem[] = pageRows.map((row) => ({
    ...row,
    matched_status:
      (statusByActivityId.get(row.id) as "completed" | "partial" | undefined) ??
      null,
    insight_headline: headlineByActivityId.get(row.id) ?? null,
  }))

  return {
    activities,
    nextCursor: hasMore ? pageRows[pageRows.length - 1].start_time : null,
  }
}

export interface ActivityLap {
  start_time: string
  duration_s?: number
  distance_m?: number
  avg_hr?: number
  max_hr?: number
  avg_power?: number
  avg_speed_mps?: number
}

export interface ActivityDetail {
  id: string
  sport: string
  name: string | null
  source: string
  start_time: string
  duration_s: number | null
  moving_time_s: number | null
  distance_m: number | null
  elevation_gain_m: number | null
  avg_hr: number | null
  max_hr: number | null
  avg_power: number | null
  normalized_power: number | null
  avg_cadence: number | null
  avg_speed_mps: number | null
  tss: number | null
  intensity_factor: number | null
  threshold_snapshot: Record<string, number | string> | null
  hr_zones: number[] | null
  power_zones: number[] | null
  laps: ActivityLap[] | null
  route_polyline: string | null
  extra_metrics: Record<string, number | string> | null
}

export interface ActivityStreamsRow {
  resolution_s: number
  data: {
    t: number[]
    hr?: number[]
    watts?: number[]
    pace?: number[]
    cad?: number[]
    alt?: number[]
    dist?: number[]
    lat?: number[]
    lng?: number[]
  }
}

export interface ActivityDetailResult {
  activity: ActivityDetail | null
  streams: ActivityStreamsRow | null
  insightHeadline: string | null
  insightText: string | null
}

export async function fetchActivityDetail(
  supabase: SupabaseClient,
  userId: string,
  activityId: string
): Promise<ActivityDetailResult> {
  const [{ data: activity }, { data: streams }, { data: insight }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("*")
        .eq("id", activityId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("activity_streams")
        .select("resolution_s, data")
        .eq("activity_id", activityId)
        .maybeSingle(),
      supabase
        .from("activity_insights")
        .select("headline, insight_text")
        .eq("activity_id", activityId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  return {
    activity: (activity as ActivityDetail | null) ?? null,
    streams: (streams as ActivityStreamsRow | null) ?? null,
    insightHeadline: insight?.headline ?? null,
    insightText: insight?.insight_text ?? null,
  }
}
