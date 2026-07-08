"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Stable, non-sensitive error codes returned to the client. The client maps
 * these to localized, user-friendly copy. We NEVER return a provider's raw
 * error message: it can contain internal details — or, when server config is
 * broken, secrets (e.g. a malformed service-role key surfaces in the
 * "invalid header value" error). Those go to the server log only.
 */
export type AuthErrorCode =
  | "missing_fields"
  | "password_short"
  | "email_taken"
  | "invalid_credentials"
  | "server_error"

export interface AuthResult {
  ok: boolean
  code?: AuthErrorCode
}

/**
 * Log the real error server-side (where only we can see it) and return a
 * generic code to the client. Keeps secrets and internals out of the browser.
 */
function serverError(context: string, error: unknown): AuthResult {
  console.error(`[auth] ${context}:`, error)
  return { ok: false, code: "server_error" }
}

interface SignUpInput {
  email: string
  password: string
  fullName: string
}

/**
 * Create an account. If the visitor already has an anonymous (guest) session,
 * that SAME user id is promoted in place — preserving idea, profile, and roadmap.
 * Uses the admin API with email auto-confirm so the flow completes without an
 * external email step.
 */
export async function signUpAction(input: SignUpInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase()
  const { password, fullName } = input
  if (!email || !password) return { ok: false, code: "missing_fields" }
  if (password.length < 8) return { ok: false, code: "password_short" }

  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Basic guard: reject if the email already belongs to a different account,
    // returning a clean error instead of leaning on the admin API to fail.
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()
    if (existingProfile && existingProfile.id !== user?.id) {
      return { ok: false, code: "email_taken" }
    }

    if (user && user.is_anonymous) {
      // Promote the anonymous guest to a permanent account (same uid).
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (error) return serverError("promote guest", error)

      await admin.from("profiles").update({ email, full_name: fullName }).eq("id", user.id)
    } else {
      // No guest session — create a fresh account.
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (error || !data.user) return serverError("create user", error)
      await admin.from("profiles").update({ email, full_name: fullName }).eq("id", data.user.id)
    }

    return { ok: true }
  } catch (error) {
    return serverError("signUp", error)
  }
}

interface SignInInput {
  email: string
  password: string
}

/**
 * Sign in an existing account with email + password against the server client,
 * mirroring signUpAction's { ok, code } contract.
 */
export async function signInAction(input: SignInInput): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase()
  const { password } = input
  if (!email || !password) return { ok: false, code: "missing_fields" }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Supabase returns a 400 with "Invalid login credentials" for both a
      // wrong password and an unknown email. Anything else is unexpected —
      // log it and stay generic so no internals reach the client.
      if (error.status === 400) return { ok: false, code: "invalid_credentials" }
      return serverError("signIn", error)
    }
    return { ok: true }
  } catch (error) {
    return serverError("signIn", error)
  }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { ok: true }
}
