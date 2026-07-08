import type { Feature, Tier } from "./types"

const TIER_RANK: Record<Tier, number> = {
  free: 0,
  basic: 1,
  professional: 2,
  enterprise: 3,
}

// Minimum tier required for each feature.
const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  roadmap: "free",
  checklist_basic: "free",
  document_upload_id: "free",
  checklist_full: "basic",
  document_upload_all: "basic",
  ai_validation: "basic",
  ai_consultant: "basic",
  specialist_call: "professional",
  partner_scheduling: "enterprise",
}

export function can(tier: Tier, feature: Feature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]]
}

export function requiredTierFor(feature: Feature): Tier {
  return FEATURE_MIN_TIER[feature]
}

export function tierLabel(tier: Tier): string {
  switch (tier) {
    case "free":
      return "Free"
    case "basic":
      return "Basic"
    case "professional":
      return "Professional"
    case "enterprise":
      return "Enterprise"
  }
}
