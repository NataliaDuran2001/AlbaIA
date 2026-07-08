"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getTier } from "@/lib/data"
import { can } from "@/lib/gating"

type ConsultationKind = "lawyer" | "accountant"

/**
 * Book a consultation by spending one credit of the given kind. Scheduling is an
 * Enterprise feature (partner_scheduling); credits are decremented under the
 * user's own RLS-scoped session.
 */
export async function scheduleConsultation(kind: ConsultationKind) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }

  const tier = await getTier(user.id)
  if (!can(tier, "partner_scheduling")) {
    return { ok: false, error: "Upgrade to Enterprise to schedule consultations." }
  }

  const { data: credit } = await supabase
    .from("consultation_credits")
    .select("id, remaining")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .maybeSingle()

  if (!credit || credit.remaining <= 0) return { ok: false, error: "No credits remaining." }

  const remaining = credit.remaining - 1
  const { error } = await supabase.from("consultation_credits").update({ remaining }).eq("id", credit.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/partners")
  revalidatePath("/dashboard")
  return { ok: true, remaining }
}
