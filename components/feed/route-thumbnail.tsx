"use client"

import { useInView } from "@/hooks/use-in-view"
import { decodePolyline } from "@/lib/garmin/polyline"
import { getSportTheme } from "@/lib/sport-theme"

interface RouteThumbnailProps {
  routePolyline: string | null
  sport: string
}

const VIEWBOX_SIZE = 100
const PADDING = 8

/**
 * Com GPS: SVG puro a partir do route_polyline (spec: identidade visual sem
 * tiles de mapa). Sem GPS (indoor): ícone do esporte como placeholder — as
 * ilustrações dedicadas por modalidade ficam pra 4.6 (aguardam assets do
 * designer).
 */
export function RouteThumbnail({ routePolyline, sport }: RouteThumbnailProps) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const theme = getSportTheme(sport)

  return (
    <div
      ref={ref}
      className="flex h-32 w-full items-center justify-center overflow-hidden rounded-md bg-muted"
    >
      {!inView ? null : routePolyline ? (
        <RouteSvg routePolyline={routePolyline} color={theme.colorVar} />
      ) : (
        <theme.icon className="size-10" color={theme.colorVar} />
      )}
    </div>
  )
}

function RouteSvg({
  routePolyline,
  color,
}: {
  routePolyline: string
  color: string
}) {
  const points = decodePolyline(routePolyline)
  if (points.length < 2) return null

  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latRange = maxLat - minLat || 1
  const lngRange = maxLng - minLng || 1
  const drawableSize = VIEWBOX_SIZE - PADDING * 2
  const scale = drawableSize / Math.max(latRange, lngRange)

  // Centraliza o traçado no viewBox quadrado (a escala é a mesma nos dois
  // eixos, pra não distorcer a forma real da rota).
  const offsetX = PADDING + (drawableSize - lngRange * scale) / 2
  const offsetY = PADDING + (drawableSize - latRange * scale) / 2

  const svgPoints = points
    .map((p) => {
      const x = offsetX + (p.lng - minLng) * scale
      // Y invertido: latitude cresce pra cima, SVG cresce pra baixo.
      const y = offsetY + (maxLat - p.lat) * scale
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      className="h-full w-full"
    >
      <polyline
        points={svgPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
