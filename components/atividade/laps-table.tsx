import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ActivityLap } from "@/lib/db/activities"
import {
  formatDistanceKm,
  formatDuration,
  formatHr,
  formatWatts,
} from "@/lib/format"

interface LapsTableProps {
  laps: ActivityLap[]
  sport: string
}

export function LapsTable({ laps, sport }: LapsTableProps) {
  if (laps.length === 0) return null

  const hasPower = sport === "bike"

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Voltas</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Distância</TableHead>
            <TableHead>FC média</TableHead>
            {hasPower ? <TableHead>Potência</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {laps.map((lap, index) => (
            <TableRow key={`${lap.start_time}-${index}`}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{formatDuration(lap.duration_s)}</TableCell>
              <TableCell>
                {lap.distance_m ? formatDistanceKm(lap.distance_m) : "—"}
              </TableCell>
              <TableCell>{formatHr(lap.avg_hr)}</TableCell>
              {hasPower ? (
                <TableCell>{formatWatts(lap.avg_power)}</TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
