"use client"

import dynamic from "next/dynamic"

import { LapsTable } from "@/components/atividade/laps-table"
import { StreamCharts } from "@/components/atividade/stream-charts"
import { TimeInZones } from "@/components/atividade/time-in-zones"
import { Separator } from "@/components/ui/separator"
import type {
  ActivityDetail as ActivityDetailData,
  ActivityStreamsRow,
} from "@/lib/db/activities"
import {
  formatDistanceKm,
  formatDuration,
  formatHr,
  formatPace,
  formatTss,
  formatWatts,
} from "@/lib/format"
import { getSportTheme } from "@/lib/sport-theme"

// Leaflet toca window/document na importação — precisa ser client-only.
const ActivityMap = dynamic(
  () => import("@/components/atividade/activity-map").then((m) => m.ActivityMap),
  { ssr: false }
)

interface ActivityDetailProps {
  activity: ActivityDetailData
  streams: ActivityStreamsRow | null
  insightHeadline: string | null
  insightText: string | null
  timezone: string
}

const EXTRA_METRIC_LABELS: Record<string, string> = {
  calories: "Calorias",
  avg_stroke_count: "Braçadas médias",
  pool_length_m: "Comprimento da piscina",
  swim_stroke: "Estilo",
  left_right_balance: "Balanço E/D",
  training_effect: "Training Effect",
}

function buildMetricRows(activity: ActivityDetailData): Array<{
  label: string
  value: string
}> {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Duração", value: formatDuration(activity.duration_s) },
    {
      label: "Tempo em movimento",
      value: activity.moving_time_s ? formatDuration(activity.moving_time_s) : null,
    },
    {
      label: "Distância",
      value: activity.distance_m ? formatDistanceKm(activity.distance_m) : null,
    },
    {
      label: "Ganho de elevação",
      value: activity.elevation_gain_m
        ? `${Math.round(activity.elevation_gain_m)} m`
        : null,
    },
    { label: "FC média", value: activity.avg_hr ? formatHr(activity.avg_hr) : null },
    { label: "FC máxima", value: activity.max_hr ? formatHr(activity.max_hr) : null },
    {
      label: "Potência média",
      value: activity.avg_power ? formatWatts(activity.avg_power) : null,
    },
    {
      label: "Potência normalizada",
      value: activity.normalized_power ? formatWatts(activity.normalized_power) : null,
    },
    {
      label: "Cadência média",
      value: activity.avg_cadence ? `${Math.round(activity.avg_cadence)} rpm` : null,
    },
    {
      label: "Pace médio",
      value:
        activity.avg_speed_mps && activity.sport === "run"
          ? `${formatPace(activity.avg_speed_mps, 1000)}/km`
          : activity.avg_speed_mps && activity.sport === "swim"
            ? `${formatPace(activity.avg_speed_mps, 100)}/100m`
            : null,
    },
    {
      label: "TSS",
      value: activity.tss !== null && activity.tss !== undefined ? formatTss(activity.tss) : null,
    },
    {
      label: "Fator de intensidade",
      value:
        activity.intensity_factor !== null && activity.intensity_factor !== undefined
          ? activity.intensity_factor.toFixed(2)
          : null,
    },
  ]

  return rows.filter(
    (row): row is { label: string; value: string } => row.value !== null
  )
}

export function ActivityDetail({
  activity,
  streams,
  insightHeadline,
  insightText,
  timezone,
}: ActivityDetailProps) {
  const theme = getSportTheme(activity.sport)
  const metricRows = buildMetricRows(activity)
  const extraMetrics = Object.entries(activity.extra_metrics ?? {})
  const laps = activity.laps ?? []

  const lats = streams?.data.lat ?? []
  const lngs = streams?.data.lng ?? []
  const points = lats
    .map((lat, index) => ({ lat, lng: lngs[index] }))
    .filter((point): point is { lat: number; lng: number } => point.lng !== undefined)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <theme.icon className="size-6 shrink-0" color={theme.colorVar} />
        <div>
          <h1 className="text-lg font-semibold">{activity.name || theme.label}</h1>
          <p className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: timezone,
            }).format(new Date(activity.start_time))}
          </p>
        </div>
      </div>

      {insightHeadline ? (
        <p className="text-base font-medium italic">{insightHeadline}</p>
      ) : null}
      {insightText ? (
        <p className="text-sm text-muted-foreground">{insightText}</p>
      ) : null}

      {points.length >= 2 ? <ActivityMap points={points} /> : null}

      <Separator />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {metricRows.map((row) => (
          <div key={row.label}>
            <p className="text-xs text-muted-foreground">{row.label}</p>
            <p className="font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      {extraMetrics.length > 0 ? (
        <>
          <Separator />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {extraMetrics.map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground">
                  {EXTRA_METRIC_LABELS[key] ?? key}
                </p>
                <p className="font-medium">{String(value)}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <TimeInZones
        hrZones={activity.hr_zones}
        powerZones={activity.power_zones}
        sport={activity.sport}
        thresholdSnapshot={activity.threshold_snapshot}
      />

      {laps.length > 0 ? (
        <>
          <Separator />
          <LapsTable laps={laps} sport={activity.sport} />
        </>
      ) : null}

      <Separator />

      {streams ? (
        <StreamCharts streams={streams} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Sem dados detalhados de streams para esta atividade.
        </p>
      )}
    </div>
  )
}
