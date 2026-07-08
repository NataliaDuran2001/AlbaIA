"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { failure } from "@/lib/actions/errors"

/**
 * Finalization submit: once the required legal documents are uploaded, mark the
 * user's outstanding checklist items as submitted for review. RLS scopes the
 * update to the caller's own rows.
 */
export async function submitFinalization() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }

  const { error } = await supabase
    .from("checklist_items")
    .update({ status: "submitted" })
    .eq("user_id", user.id)
    .eq("status", "pending")
  if (error) return failure("submit finalization", error)

  revalidatePath("/checklist")
  revalidatePath("/dashboard")
  revalidatePath("/complete")
  return { ok: true }
}
