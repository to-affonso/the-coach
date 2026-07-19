import { computeBikePowerZones, computeHrZones, type Zone } from "@/lib/metrics/zones"

interface TimeInZonesProps {
  hrZones: number[] | null
  powerZones: number[] | null
  sport: string
  thresholdSnapshot: Record<string, number | string> | null
}

function formatZoneDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min`
}

/**
 * hr_zones/power_zones no banco são só arrays de segundos (sem labels) — os
 * limites/labels são reconstruídos aqui a partir do threshold_snapshot
 * congelado na atividade, com as mesmas funções de lib/metrics/zones.ts
 * usadas no cálculo original (rule 6: o limiar vigente na data, não o atual).
 */
export function TimeInZones({
  hrZones,
  powerZones,
  sport,
  thresholdSnapshot,
}: TimeInZonesProps) {
  const lthr =
    typeof thresholdSnapshot?.lthr === "number" ? thresholdSnapshot.lthr : undefined
  const ftp =
    typeof thresholdSnapshot?.ftp === "number" ? thresholdSnapshot.ftp : undefined

  const hrZoneDefs = hrZones && lthr ? computeHrZones(lthr) : null
  const powerZoneDefs =
    powerZones && sport === "bike" && ftp ? computeBikePowerZones(ftp) : null

  if (!hrZoneDefs && !powerZoneDefs) return null

  return (
    <div className="flex flex-col gap-4">
      {powerZoneDefs && powerZones ? (
        <ZoneBars
          title="Tempo em zonas de potência"
          zones={powerZoneDefs}
          seconds={powerZones}
        />
      ) : null}
      {hrZoneDefs && hrZones ? (
        <ZoneBars title="Tempo em zonas de FC" zones={hrZoneDefs} seconds={hrZones} />
      ) : null}
    </div>
  )
}

function ZoneBars({
  title,
  zones,
  seconds,
}: {
  title: string
  zones: Zone[]
  seconds: number[]
}) {
  const total = seconds.reduce((sum, value) => sum + value, 0)

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {zones.map((zone, index) => {
        const value = seconds[index] ?? 0
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <div key={zone.zone} className="flex items-center gap-2 text-sm">
            <span className="w-32 shrink-0 text-muted-foreground">
              {zone.label}
            </span>
            <div className="h-2 flex-1 bg-muted">
              <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right text-muted-foreground">
              {formatZoneDuration(value)} ({pct}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}
