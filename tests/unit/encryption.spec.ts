import { test } from "node:test"
import assert from "node:assert/strict"

// A deterministic 32-byte key for the test run.
process.env.DATA_ENCRYPTION_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="

const { encrypt, decrypt, isEncrypted, encryptionAvailable } = await import("../../lib/crypto/encryption.ts")

test("encryption is available when the key is set", () => {
  assert.equal(encryptionAvailable(), true)
})

test("round-trips plaintext through AES-256-GCM", () => {
  const plain = "DPI 1234 56789 0101"
  const ct = encrypt(plain)
  assert.notEqual(ct, plain)
  assert.ok(isEncrypted(ct), "ciphertext should carry the version prefix")
  assert.equal(decrypt(ct), plain)
})

test("produces a fresh IV each call (ciphertexts differ)", () => {
  const a = encrypt("same value")
  const b = encrypt("same value")
  assert.notEqual(a, b)
  assert.equal(decrypt(a), decrypt(b))
})

test("tampered ciphertext fails authentication", () => {
  const ct = encrypt("sensitive")
  // Flip a character in the data segment.
  const parts = ct.split(":")
  parts[3] = parts[3].slice(0, -2) + (parts[3].slice(-2) === "AA" ? "BB" : "AA")
  assert.throws(() => decrypt(parts.join(":")))
})

test("isEncrypted is false for plaintext", () => {
  assert.equal(isEncrypted("just a string"), false)
  assert.equal(isEncrypted(null), false)
})
