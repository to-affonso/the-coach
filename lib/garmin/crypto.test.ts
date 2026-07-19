import crypto from "crypto"
import { beforeAll, describe, expect, it } from "vitest"

import { decrypt, encrypt } from "@/lib/garmin/crypto"

beforeAll(() => {
  process.env.GARMIN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64")
})

describe("encrypt/decrypt", () => {
  it("faz round-trip: decrypt(encrypt(x)) === x", () => {
    const payload = JSON.stringify({ oauth1: { oauth_token: "abc" } })
    expect(decrypt(encrypt(payload))).toBe(payload)
  })

  it("o texto cifrado não contém o texto original", () => {
    const payload = "segredo-do-garmin-nao-pode-vazar"
    expect(encrypt(payload)).not.toContain(payload)
  })

  it("gera ciphertexts diferentes para a mesma entrada (IV aleatório)", () => {
    const payload = "mesmo-valor"
    expect(encrypt(payload)).not.toBe(encrypt(payload))
  })

  it("rejeita decrypt com payload adulterado (auth tag do GCM)", () => {
    const tampered = encrypt("valor-original").slice(0, -4) + "AAAA"
    expect(() => decrypt(tampered)).toThrow()
  })
})
