import "server-only"
import type { Tier } from "@/lib/types"

export interface CheckoutResult {
  customerId: string
  status: "active"
  currentPeriodEnd: string
}

/**
 * BillingProvider abstracts the payment processor. Stripe Checkout backs it now;
 * Recurrente (Guatemala) can implement the same interface later without touching
 * the app. `fulfill` represents the post-payment webhook that grants access.
 */
export interface BillingProvider {
  readonly name: string
  fulfill(userId: string, tier: Exclude<Tier, "free">): Promise<CheckoutResult>
}

/**
 * v0 provider: simulates Stripe test-mode fulfillment deterministically.
 * The real Stripe provider (Checkout Session + webhook) drops in here behind
 * the same interface and env-based selection.
 */
const simulatedProvider: BillingProvider = {
  name: "stripe-test",
  async fulfill(userId, tier) {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    return {
      customerId: `cus_test_${userId.slice(0, 8)}`,
      status: "active",
      currentPeriodEnd: periodEnd.toISOString(),
    }
  },
}

export function getBillingProvider(): BillingProvider {
  // When STRIPE_SECRET_KEY is present, swap in the real Stripe provider here.
  return simulatedProvider
}
