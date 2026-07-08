"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBillingProvider } from "@/lib/billing"
import { getPlan } from "@/lib/billing/plans"
import { failure } from "@/lib/actions/errors"
import type { Tier } from "@/lib/types"

/**
 * Confirm checkout. This represents the trusted post-payment webhook: the
 * subscriptions row is written ONLY here via the service-role client, never by
 * the browser. Enterprise also provisions consultation credits.
 */
export async function confirmCheckout(tier: string) {
  const plan = getPlan(tier)
  if (!plan) return { ok: false, error: "Unknown plan." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated." }

  const provider = getBillingProvider()
  const result = await provider.fulfill(user.id, plan.tier)

  const admin = createAdminClient()
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: user.id,
      tier: plan.tier as Tier,
      stripe_customer_id: result.customerId,
      status: result.status,
      current_period_end: result.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  if (error) return failure("confirm checkout", error)

  if (plan.tier === "enterprise") {
    await admin.from("consultation_credits").delete().eq("user_id", user.id)
    await admin.from("consultation_credits").insert([
      { user_id: user.id, kind: "lawyer", remaining: 2 },
      { user_id: user.id, kind: "accountant", remaining: 2 },
    ])
  }

  revalidatePath("/checklist")
  revalidatePath("/dashboard")
  revalidatePath("/partners")

  return {
    ok: true,
    tier: plan.tier,
    currentPeriodEnd: result.currentPeriodEnd,
    features: plan.features,
  }
}
