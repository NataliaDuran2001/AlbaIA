import { test } from "node:test"
import assert from "node:assert/strict"

const { failure, GENERIC_ERROR } = await import("../../lib/actions/errors.ts")

// Silence the intentional console.error the helper emits (it logs the real
// cause server-side). Assert it still logs, but keep test output clean.
function captureConsoleError(fn: () => void): unknown[] {
  const original = console.error
  const calls: unknown[] = []
  console.error = (...args: unknown[]) => calls.push(args)
  try {
    fn()
  } finally {
    console.error = original
  }
  return calls
}

test("failure() never returns the raw provider message to the client", () => {
  // Reproduces the reported bug: a malformed service-role key makes Supabase
  // throw an error whose message embeds the secret. This must NOT reach the UI.
  // The token here is a synthetic placeholder — never a real key — so the test
  // itself doesn't ship a secret. `SECRET_MARKER` matches the "sb_secret_"
  // prefix Supabase uses, which is what we assert must not leak.
  const SECRET_MARKER = ["sb", "secret", "PLACEHOLDERdonotuse000"].join("_")
  const leaky = new Error(`Headers.append: "Bearer ${SECRET_MARKER}" is an invalid header value.`)
  let result: { ok: false; error: string }
  const logged = captureConsoleError(() => {
    result = failure("create user", leaky)
  })

  assert.equal(result!.ok, false)
  assert.equal(result!.error, GENERIC_ERROR)
  assert.doesNotMatch(result!.error, /sb_secret/, "must not leak the secret")
  assert.doesNotMatch(result!.error, /Bearer/, "must not leak auth-header internals")
  // The real cause is logged server-side (for us), not returned to the client.
  assert.equal(logged.length, 1)
})

test("GENERIC_ERROR carries no provider internals", () => {
  assert.doesNotMatch(GENERIC_ERROR, /sb_secret|Bearer|Headers|Supabase/i)
})
