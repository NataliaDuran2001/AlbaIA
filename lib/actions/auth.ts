"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
export async function signUpAction(input: SignUpInput) {
  const email = input.email.trim().toLowerCase()
  const { password, fullName } = input
  if (!email || !password) return { ok: false, error: "Email and password are required." }
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." }

  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && user.is_anonymous) {
    // Promote the anonymous guest to a permanent account (same uid).
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error) return { ok: false, error: error.message }

    await admin.from("profiles").update({ email, full_name: fullName }).eq("id", user.id)
  } else {
    // No guest session — create a fresh account.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (error || !data.user) return { ok: false, error: error?.message ?? "Could not create account." }
    await admin.from("profiles").update({ email, full_name: fullName }).eq("id", data.user.id)
  }

  return { ok: true }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { ok: true }
}
