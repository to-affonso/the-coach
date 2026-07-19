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

/** Inverso de encodePolyline — usado para desenhar o SVG do thumbnail no Feed/detalhe. */
export function decodePolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = []
  let index = 0
  let lat = 0
  let lng = 0

  function decodeSignedNumber(): number {
    let result = 0
    let shift = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < encoded.length) {
    lat += decodeSignedNumber()
    lng += decodeSignedNumber()
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
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
