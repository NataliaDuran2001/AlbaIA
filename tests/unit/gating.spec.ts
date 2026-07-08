import { test } from "node:test"
import assert from "node:assert/strict"
import { can, requiredTierFor, tierLabel } from "../../lib/gating.ts"

type Tier = "free" | "basic" | "professional" | "enterprise"
type Feature =
  | "checklist_basic"
  | "checklist_full"
  | "roadmap"
  | "document_upload_id"
  | "document_upload_all"
  | "ai_validation"
  | "ai_consultant"
  | "specialist_call"
  | "partner_scheduling"

const RANK: Record<Tier, number> = { free: 0, basic: 1, professional: 2, enterprise: 3 }
const MIN: Record<Feature, Tier> = {
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

const TIERS = Object.keys(RANK) as Tier[]
const FEATURES = Object.keys(MIN) as Feature[]

test("can(): full tier × feature matrix matches minimum-tier ranking", () => {
  for (const tier of TIERS) {
    for (const feature of FEATURES) {
      const expected = RANK[tier] >= RANK[MIN[feature]]
      assert.equal(can(tier, feature), expected, `can(${tier}, ${feature}) should be ${expected}`)
    }
  }
})

test("free tier unlocks only the free features", () => {
  assert.equal(can("free", "roadmap"), true)
  assert.equal(can("free", "checklist_basic"), true)
  assert.equal(can("free", "checklist_full"), false)
  assert.equal(can("free", "partner_scheduling"), false)
})

test("enterprise unlocks every feature", () => {
  for (const feature of FEATURES) assert.equal(can("enterprise", feature), true)
})

test("requiredTierFor() returns the configured minimum", () => {
  assert.equal(requiredTierFor("checklist_full"), "basic")
  assert.equal(requiredTierFor("specialist_call"), "professional")
  assert.equal(requiredTierFor("partner_scheduling"), "enterprise")
})

test("tierLabel() is human-readable for each tier", () => {
  assert.equal(tierLabel("free"), "Free")
  assert.equal(tierLabel("basic"), "Basic")
  assert.equal(tierLabel("professional"), "Professional")
  assert.equal(tierLabel("enterprise"), "Enterprise")
})
