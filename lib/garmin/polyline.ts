export interface GeoPoint {
  lat: number
  lng: number
}

/** Algoritmo padrão de encoded polyline (Google), precisão de 5 casas decimais. */
export function encodePolyline(points: GeoPoint[]): string {
  let result = ""
  let prevLat = 0
  let prevLng = 0

  for (const { lat, lng } of points) {
    const latE5 = Math.round(lat * 1e5)
    const lngE5 = Math.round(lng * 1e5)
    result += encodeSignedNumber(latE5 - prevLat)
    result += encodeSignedNumber(lngE5 - prevLng)
    prevLat = latE5
    prevLng = lngE5
  }

  return result
}

function encodeSignedNumber(num: number): string {
  let sgnNum = num << 1
  if (num < 0) sgnNum = ~sgnNum
  return encodeNumber(sgnNum)
}

function encodeNumber(num: number): string {
  let result = ""
  while (num >= 0x20) {
    result += String.fromCharCode((0x20 | (num & 0x1f)) + 63)
    num >>= 5
  }
  result += String.fromCharCode(num + 63)
  return result
}

const MAX_ROUTE_POINTS = 100

/** Decima uma lista de pontos GPS para no máximo `maxPoints`, mantendo início e fim. */
function decimate(points: GeoPoint[], maxPoints: number): GeoPoint[] {
  if (points.length <= maxPoints) return points

  const step = (points.length - 1) / (maxPoints - 1)
  const decimated: GeoPoint[] = []
  for (let i = 0; i < maxPoints; i++) {
    decimated.push(points[Math.round(i * step)])
  }
  return decimated
}

/** null quando não há GPS (atividade indoor) — não deve gerar erro. */
export function buildRoutePolyline(points: GeoPoint[]): string | null {
  if (points.length === 0) return null
  return encodePolyline(decimate(points, MAX_ROUTE_POINTS))
}
