import { test } from "node:test"
import assert from "node:assert/strict"
import { analyzeBusiness, __setClientForTest } from "../../lib/ai/analyze.ts"
import { STEP_CATALOG, STEP_KEYS, CATALOG_VERSION } from "../../lib/ai/catalog.ts"

const VALID_KEYS = new Set<string>(STEP_KEYS)

type ParseResult = { parsed_output: unknown }

// Minimal stand-in for the Anthropic client. Only `messages.parse` is used by
// analyzeBusiness; the resolver mjs hook lets this .ts file import the real
// module (server-only + @/ alias) under `node --test`.
function mockClient(handler: () => ParseResult | Promise<ParseResult>) {
  return { messages: { parse: async () => handler() } } as never
}

const profile = { size: "small", industry: "food", city: "Guatemala City" } as const

test("AI result: every persisted step key belongs to the catalog (AC#2)", async () => {
  __setClientForTest(
    mockClient(() => ({
      parsed_output: {
        recommendedStructure: "Limited Liability Company (Sociedad de Responsabilidad Limitada)",
        rationale: "A S.R.L. fits a small multi-owner food business.",
        stepKeys: [
          "identity_verification",
          "address_confirmation",
          "nit_registration",
          "sat_enrollment",
          "deed_incorporation",
          "commercial_registry",
          "sanitary_license",
        ],
      },
    })),
  )
  try {
    const result = await analyzeBusiness("A bakery", profile)
    assert.equal(result.generatedBy, "ai")
    assert.equal(result.model, "claude-opus-4-8")
    assert.equal(result.catalogVersion, CATALOG_VERSION)
    assert.ok(result.roadmap.steps.length > 0)
    for (const step of result.roadmap.steps) {
      assert.ok(VALID_KEYS.has(step.key), `step key "${step.key}" must be in STEP_KEYS`)
      // Label/description/premium come from the catalog, never from the model.
      assert.equal(step.label, STEP_CATALOG[step.key as keyof typeof STEP_CATALOG].label)
      assert.equal(step.status, "pending")
    }
  } finally {
    __setClientForTest(null)
  }
})

test("AI result: unknown keys are dropped, not persisted (AC#2 defense-in-depth)", async () => {
  __setClientForTest(
    mockClient(() => ({
      parsed_output: {
        recommendedStructure: "Sole Proprietor",
        rationale: "Solo owner.",
        // A key not in the catalog must never reach the persisted steps.
        stepKeys: ["identity_verification", "totally_made_up_key", "sat_enrollment"],
      },
    })),
  )
  try {
    const result = await analyzeBusiness("A consultant", profile)
    const keys = result.roadmap.steps.map((s) => s.key)
    assert.deepEqual(keys, ["identity_verification", "sat_enrollment"])
    for (const step of result.roadmap.steps) assert.ok(VALID_KEYS.has(step.key))
  } finally {
    __setClientForTest(null)
  }
})

test("API failure falls back cleanly: generated_by=fallback, model=null (AC#3)", async () => {
  __setClientForTest(
    mockClient(() => {
      throw new Error("network down")
    }),
  )
  try {
    const result = await analyzeBusiness("A bakery in Guatemala City", profile)
    assert.equal(result.generatedBy, "fallback")
    assert.equal(result.model, null)
    assert.ok(result.roadmap.steps.length > 0)
    assert.ok(result.roadmap.rationale.length > 0)
    for (const step of result.roadmap.steps) assert.ok(VALID_KEYS.has(step.key))
  } finally {
    __setClientForTest(null)
  }
})

test("null parse output falls back (AC#3)", async () => {
  __setClientForTest(mockClient(() => ({ parsed_output: null })))
  try {
    const result = await analyzeBusiness("A shop", { size: "solo", industry: "retail", city: "" })
    assert.equal(result.generatedBy, "fallback")
    assert.equal(result.model, null)
    // Solo → no deed/registry steps in the fallback.
    const keys = result.roadmap.steps.map((s) => s.key)
    assert.ok(!keys.includes("deed_incorporation"))
  } finally {
    __setClientForTest(null)
  }
})
