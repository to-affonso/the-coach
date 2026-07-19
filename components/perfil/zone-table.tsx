import type { Zone } from "@/lib/metrics/zones"
import { formatZoneBound } from "@/components/perfil/format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ZoneTableProps {
  zones: Zone[]
  metric: "ftp" | "threshold_pace" | "css" | "lthr" | "max_hr"
}

export function ZoneTable({ zones, metric }: ZoneTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Zona</TableHead>
          <TableHead>De</TableHead>
          <TableHead>Até</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {zones.map((zone) => (
          <TableRow key={zone.zone}>
            <TableCell>
              Z{zone.zone} {zone.label}
            </TableCell>
            <TableCell>{formatZoneBound(metric, zone.min)}</TableCell>
            <TableCell>{formatZoneBound(metric, zone.max)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
