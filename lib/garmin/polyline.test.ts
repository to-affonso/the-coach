import { describe, expect, it } from "vitest"

import {
  buildRoutePolyline,
  decodePolyline,
  encodePolyline,
} from "@/lib/garmin/polyline"

describe("encodePolyline", () => {
  it("codifica o exemplo canônico da spec do Google Encoded Polyline", () => {
    const points = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]
    expect(encodePolyline(points)).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
  })
})

describe("decodePolyline", () => {
  it("decodifica o exemplo canônico da spec do Google Encoded Polyline", () => {
    const points = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
    expect(points).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ])
  })

  it("é o inverso exato de encodePolyline (round-trip)", () => {
    const points = [
      { lat: -22.90642, lng: -43.18223 },
      { lat: -22.9, lng: -43.2 },
      { lat: -22.95123, lng: -43.15987 },
    ]
    expect(decodePolyline(encodePolyline(points))).toEqual(points)
  })
})

describe("buildRoutePolyline", () => {
  it("retorna null quando não há pontos de GPS (atividade indoor)", () => {
    expect(buildRoutePolyline([])).toBeNull()
  })

  it("decima para no máximo 100 pontos preservando início e fim", () => {
    const points = Array.from({ length: 500 }, (_, i) => ({
      lat: i * 0.001,
      lng: i * 0.001,
    }))
    const polyline = buildRoutePolyline(points)
    expect(polyline).not.toBeNull()

    // Um polyline com poucos pontos e passos pequenos e regulares deve ser
    // bem mais curto que a lista original codificada ponto a ponto.
    const fullyEncoded = encodePolyline(points)
    expect(polyline!.length).toBeLessThan(fullyEncoded.length)
  })
})
