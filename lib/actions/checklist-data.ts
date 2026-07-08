"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getTier } from "@/lib/data"
import { can } from "@/lib/gating"
import { catalogEntry } from "@/lib/ai/catalog"
import { encrypt, encryptionAvailable } from "@/lib/crypto/encryption"
import { failure } from "@/lib/actions/errors"

/**
 * Save the captured value for a "data" checklist step. Sensitive values (DPI,
 * NIT, address) are encrypted (AES-256-GCM) before being written to Supabase;
 * the plaintext never leaves the server. Marks the step as submitted.
 */
export async function saveChecklistData(itemId: string, value: string) {
  const trimmed = value.trim()
  if (!trimmed) return { ok: false, error: "Please enter a value." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }

  const { data: item } = await supabase
    .from("checklist_items")
    .select("id, key, premium, input_kind")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!item) return { ok: false, error: "Item not found." }
  if (item.input_kind !== "data") return { ok: false, error: "This step does not accept a value." }

  // Gate premium data steps behind an active paid tier (same rule as uploads).
  if (item.premium) {
    const tier = await getTier(user.id)
    if (!can(tier, "checklist_full")) {
      return { ok: false, error: "This step requires a subscription." }
    }
  }

  const entry = catalogEntry(item.key)
  const sensitive = entry?.sensitive === true

  let stored = trimmed
  if (sensitive) {
    if (!encryptionAvailable()) {
      // Fail closed: never persist sensitive data in plaintext.
      return { ok: false, error: "Secure storage is not configured. Please contact support." }
    }
    stored = encrypt(trimmed)
  }

  const { error } = await supabase
    .from("checklist_items")
    .update({ data_value: stored, data_is_sensitive: sensitive, status: "submitted" })
    .eq("id", itemId)
    .eq("user_id", user.id)

  if (error) return failure("save checklist data", error)

  revalidatePath("/checklist")
  revalidatePath("/status")
  revalidatePath("/documents")
  revalidatePath("/dashboard")
  return { ok: true }
}
