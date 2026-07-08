"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getTier } from "@/lib/data"
import { can } from "@/lib/gating"
import type { ChecklistStatus } from "@/lib/types"

export async function updateChecklistStatus(itemId: string, status: ChecklistStatus) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }

  const { data: item } = await supabase
    .from("checklist_items")
    .select("id, premium")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!item) return { ok: false, error: "Item not found." }

  // Gate premium items behind an active paid tier.
  if (item.premium) {
    const tier = await getTier(user.id)
    if (!can(tier, "checklist_full")) {
      return { ok: false, error: "This step requires a subscription." }
    }
  }

  const { error } = await supabase
    .from("checklist_items")
    .update({ status })
    .eq("id", itemId)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath("/checklist")
  revalidatePath("/dashboard")
  return { ok: true }
}
