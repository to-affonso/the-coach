import Link from "next/link"

import { RouteThumbnail } from "@/components/feed/route-thumbnail"
import { Sparkline } from "@/components/feed/sparkline"
import { Badge } from "@/components/ui/badge"
import type { ActivityFeedItem } from "@/lib/db/activities"
import {
  formatDistanceKm,
  formatDuration,
  formatHr,
  formatPace,
  formatTimeOfDay,
  formatTss,
  formatWatts,
} from "@/lib/format"
import { getSportTheme } from "@/lib/sport-theme"

interface ActivityCardProps {
  activity: ActivityFeedItem
  timezone: string
}

function buildMetrics(activity: ActivityFeedItem): string[] {
  const metrics: string[] = []

  switch (activity.sport) {
    case "bike": {
      if (activity.duration_s) metrics.push(formatDuration(activity.duration_s))
      if (activity.distance_m) metrics.push(formatDistanceKm(activity.distance_m))
      const power = activity.normalized_power ?? activity.avg_power
      if (power) metrics.push(formatWatts(power))
      if (activity.tss !== null) metrics.push(formatTss(activity.tss))
      break
    }
    case "run": {
      if (activity.duration_s) metrics.push(formatDuration(activity.duration_s))
      if (activity.distance_m) metrics.push(formatDistanceKm(activity.distance_m))
      if (activity.avg_speed_mps)
        metrics.push(`${formatPace(activity.avg_speed_mps, 1000)}/km`)
      if (activity.avg_hr) metrics.push(formatHr(activity.avg_hr))
      break
    }
    case "swim": {
      if (activity.distance_m) metrics.push(formatDistanceKm(activity.distance_m))
      if (activity.avg_speed_mps)
        metrics.push(`${formatPace(activity.avg_speed_mps, 100)}/100m`)
      if (activity.duration_s) metrics.push(formatDuration(activity.duration_s))
      if (activity.tss !== null) metrics.push(formatTss(activity.tss))
      break
    }
    case "strength": {
      if (activity.duration_s) metrics.push(formatDuration(activity.duration_s))
      if (activity.tss !== null) metrics.push(formatTss(activity.tss))
      if (activity.avg_hr) metrics.push(formatHr(activity.avg_hr))
      break
    }
  }

  return metrics
}

const BADGE_LABEL: Record<string, string> = {
  completed: "Cumprido",
  partial: "Parcial",
}

export function ActivityCard({ activity, timezone }: ActivityCardProps) {
  const theme = getSportTheme(activity.sport)
  const metrics = buildMetrics(activity)
  const badgeLabel = activity.matched_status
    ? BADGE_LABEL[activity.matched_status]
    : null

  return (
    <Link
      href={`/atividades/${activity.id}`}
      className="flex flex-col gap-3 border-b p-4 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center gap-2">
        <theme.icon className="size-5 shrink-0" color={theme.colorVar} />
        <span className="font-medium">{activity.name || theme.label}</span>
        <span className="text-sm text-muted-foreground">
          {formatTimeOfDay(activity.start_time, timezone)}
        </span>
        {badgeLabel ? (
          <Badge variant="secondary" className="ml-auto">
            {badgeLabel}
          </Badge>
        ) : null}
      </div>

      <RouteThumbnail
        routePolyline={activity.route_polyline}
        sport={activity.sport}
      />

      {metrics.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {metrics.map((metric) => (
            <span key={metric}>{metric}</span>
          ))}
        </div>
      ) : null}

      {activity.insight_headline ? (
        <p className="text-sm font-medium italic">
          {activity.insight_headline}
        </p>
      ) : null}

      <Sparkline activityId={activity.id} sport={activity.sport} />
    </Link>
  )
}
