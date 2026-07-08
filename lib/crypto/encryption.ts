import "server-only"
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/**
 * Cifrado de campos sensibles en la capa de aplicación (AES-256-GCM).
 *
 * Los datos sensibles del usuario (DPI, NIT, dirección) se cifran ANTES de
 * escribirse en Supabase y se descifran al leerse en el servidor. El texto plano
 * NUNCA sale del servidor ni se envía al cliente.
 *
 * Formato del ciphertext persistido: "v1:<iv_b64>:<tag_b64>:<data_b64>".
 * El prefijo de versión permite rotar el algoritmo/clave en el futuro.
 *
 * Clave: DATA_ENCRYPTION_KEY en el entorno — 32 bytes en base64 o hex (256 bits).
 * Genera una con:  openssl rand -base64 32
 */

const ALGO = "aes-256-gcm"
const VERSION = "v1"
const IV_BYTES = 12 // recomendado para GCM

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = process.env.DATA_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("DATA_ENCRYPTION_KEY is not set. Cannot encrypt/decrypt sensitive data.")
  }
  // Acepta base64 (44 chars con padding) o hex (64 chars).
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must decode to 32 bytes (256 bits).")
  }
  cachedKey = key
  return key
}

/** true si hay una clave de cifrado configurada (sin lanzar). */
export function encryptionAvailable(): boolean {
  try {
    getKey()
    return true
  } catch {
    return false
  }
}

/** Cifra texto plano → cadena versionada lista para persistir. */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

/**
 * Descifra una cadena producida por encrypt(). Lanza si el formato es inválido o
 * el tag de autenticación no verifica (dato manipulado).
 */
export function decrypt(payload: string): string {
  const parts = payload.split(":")
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Invalid ciphertext format.")
  }
  const [, ivB64, tagB64, dataB64] = parts
  const key = getKey()
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return decrypted.toString("utf8")
}

/** true si la cadena tiene el formato de ciphertext de este módulo. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${VERSION}:`)
}
