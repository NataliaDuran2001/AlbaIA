import "server-only"

/**
 * Generic, client-safe message for an unexpected server/provider failure.
 * Deliberately vague: raw provider errors can leak internals — or, when server
 * config is broken, secrets (e.g. a malformed service-role key surfaces inside
 * an "invalid header value" error). Those must never reach the browser.
 */
export const GENERIC_ERROR = "Something went wrong. Please try again in a moment."

/**
 * Log the real error server-side (where only we can see it) and return the
 * generic, client-safe message. Use this instead of returning a provider's
 * `error.message` to the client.
 *
 *   const { error } = await supabase.from(...).update(...)
 *   if (error) return failure("save checklist", error)
 */
export function failure(context: string, error: unknown): { ok: false; error: string } {
  console.error(`[action] ${context}:`, error)
  return { ok: false, error: GENERIC_ERROR }
}
