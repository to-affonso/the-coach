import {
  computeBikePowerZones,
  computeHrZones,
  computeRunPaceZones,
  computeSwimPaceZones,
} from "@/lib/metrics/zones"
import { Badge } from "@/components/ui/badge"
import { formatMetricValue, sourceLabels } from "@/components/perfil/format"
import { ThresholdDialog } from "@/components/perfil/threshold-dialog"
import { ZoneTable } from "@/components/perfil/zone-table"

export type Metric = "ftp" | "threshold_pace" | "css" | "lthr" | "max_hr"
export type Sport = "swim" | "bike" | "run"

export interface ThresholdEntry {
  value: number
  effective_from: string
  source: string
}

const SPORT_LABELS: Record<Sport, string> = {
  swim: "Natação",
  bike: "Bike",
  run: "Corrida",
}

const PERFORMANCE_METRIC: Record<Sport, { metric: Metric; label: string; unit: string }> = {
  bike: { metric: "ftp", label: "FTP", unit: "watts" },
  run: { metric: "threshold_pace", label: "Pace limiar", unit: "s/km" },
  swim: { metric: "css", label: "CSS", unit: "s/100m" },
}

function computePerformanceZones(sport: Sport, value: number) {
  switch (sport) {
    case "bike":
      return computeBikePowerZones(value)
    case "run":
      return computeRunPaceZones(value)
    case "swim":
      return computeSwimPaceZones(value)
  }
}

function MetricRow({
  sport,
  metric,
  label,
  entry,
}: {
  sport: Sport
  metric: Metric
  label: string
  entry: ThresholdEntry | undefined
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {entry ? (
          <p className="text-sm text-muted-foreground">
            {formatMetricValue(metric, entry.value)} ·{" "}
            <Badge variant="outline" className="align-middle">
              {sourceLabels[entry.source] ?? entry.source}
            </Badge>{" "}
            desde {entry.effective_from}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Não definido</p>
        )}
      </div>
      <ThresholdDialog
        sport={sport}
        metric={metric}
        metricLabel={label}
        unitHint={
          metric === "ftp"
            ? "watts"
            : metric === "threshold_pace" || metric === "css"
              ? "segundos"
              : "bpm"
        }
        hasExisting={Boolean(entry)}
      />
    </div>
  )
}

export function SportThresholds({
  sport,
  thresholds,
}: {
  sport: Sport
  thresholds: Partial<Record<Metric, ThresholdEntry>>
}) {
  const performance = PERFORMANCE_METRIC[sport]
  const performanceEntry = thresholds[performance.metric]
  const lthrEntry = thresholds.lthr
  const maxHrEntry = thresholds.max_hr
  const hrEntry = lthrEntry ?? maxHrEntry

  const performanceZones = performanceEntry
    ? computePerformanceZones(sport, performanceEntry.value)
    : null
  const hrZones = hrEntry ? computeHrZones(hrEntry.value) : null

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{SPORT_LABELS[sport]}</h3>

      <div className="divide-y">
        <MetricRow
          sport={sport}
          metric={performance.metric}
          label={performance.label}
          entry={performanceEntry}
        />
        <MetricRow
          sport={sport}
          metric="lthr"
          label="LTHR (FC de limiar)"
          entry={lthrEntry}
        />
        <MetricRow
          sport={sport}
          metric="max_hr"
          label="FC máxima"
          entry={maxHrEntry}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Zonas de {performance.label}
          </p>
          {performanceZones ? (
            <ZoneTable zones={performanceZones} metric={performance.metric} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Defina o {performance.label} para ver as zonas.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Zonas de FC
          </p>
          {hrZones ? (
            <ZoneTable
              zones={hrZones}
              metric={lthrEntry ? "lthr" : "max_hr"}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Defina o LTHR ou a FC máxima para ver as zonas.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
