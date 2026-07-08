import type { Tier } from "@/lib/types"

export interface Plan {
  tier: Exclude<Tier, "free">
  name: string
  price: number
  tagline: string
  features: string[]
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    tier: "basic",
    name: "Basic",
    price: 15,
    tagline: "Everything to formalize solo.",
    features: ["Full formalization checklist", "AI document validation", "3 AI consultant queries", "Document vault"],
  },
  {
    tier: "professional",
    name: "Professional",
    price: 25,
    tagline: "Extra guidance when it matters.",
    features: ["Everything in Basic", "1 specialist call", "Priority review", "Unlimited AI validation"],
    popular: true,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: 100,
    tagline: "White-glove formalization.",
    features: [
      "Everything in Professional",
      "Lawyer & accountant credits",
      "Partner catalog scheduling",
      "Dedicated support",
    ],
  },
]

export function getPlan(tier: string): Plan | undefined {
  return PLANS.find((p) => p.tier === tier)
}
