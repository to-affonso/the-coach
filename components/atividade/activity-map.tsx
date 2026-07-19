"use client"

import "leaflet/dist/leaflet.css"

import { CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet"

interface ActivityMapProps {
  points: Array<{ lat: number; lng: number }>
}

/**
 * Leaflet + OpenStreetMap (decisão em docs/spec-telas.md > "Fora do escopo",
 * gratuito, sem chave de API). Marcadores de início/fim são CircleMarker
 * (SVG puro) em vez do ícone padrão do Leaflet — evita o problema clássico
 * de bundlers não resolverem os assets de imagem do marker default.
 */
export function ActivityMap({ points }: ActivityMapProps) {
  if (points.length < 2) return null

  const positions: [number, number][] = points.map((p) => [p.lat, p.lng])

  return (
    <div className="h-72 w-full overflow-hidden rounded-md">
      <MapContainer
        bounds={positions}
        boundsOptions={{ padding: [24, 24] }}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} color="var(--color-chart-2)" />
        <CircleMarker
          center={positions[0]}
          radius={6}
          pathOptions={{ color: "var(--color-chart-3)", fillOpacity: 1 }}
        />
        <CircleMarker
          center={positions[positions.length - 1]}
          radius={6}
          pathOptions={{ color: "var(--color-destructive)", fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  )
}
