import { describe, expect, it } from "vitest"

import { buildRoutePolyline, encodePolyline } from "@/lib/garmin/polyline"

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
