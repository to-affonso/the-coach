import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const keyBase64 = process.env.GARMIN_ENCRYPTION_KEY
  if (!keyBase64) {
    throw new Error("GARMIN_ENCRYPTION_KEY não configurada.")
  }
  const key = Buffer.from(keyBase64, "base64")
  if (key.length !== 32) {
    throw new Error("GARMIN_ENCRYPTION_KEY deve decodificar para 32 bytes.")
  }
  return key
}

/** Criptografa uma string (ex.: JSON dos tokens Garmin) para guardar no banco. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64")
}

/** Descriptografa o payload gerado por `encrypt`. */
export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64")
  const iv = raw.subarray(0, IV_LENGTH)
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])
  return plaintext.toString("utf8")
}
