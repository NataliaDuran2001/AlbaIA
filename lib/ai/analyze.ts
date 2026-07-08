import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import type { BusinessProfileInput, Roadmap, RoadmapStep } from "@/lib/types"
import { CATALOG_VERSION, STEP_KEYS, catalogForPrompt, stepsFromKeys } from "@/lib/ai/catalog"

const MODEL = "claude-opus-4-8"

/**
 * Resultado del análisis: el `Roadmap` tipado más metadata de trazabilidad.
 * `generatedBy = "fallback"` con `model = null` cuando la API falla o el parse
 * devuelve null. `buildRoadmapStep` persiste estos campos en `roadmaps`.
 */
export interface AnalysisResult {
  roadmap: Roadmap
  generatedBy: "ai" | "fallback"
  model: string | null
  catalogVersion: string
}

/**
 * Schema de salida estructurada. El modelo solo elige `recommendedStructure` y
 * `rationale` (texto libre) y ORDENA claves del catálogo (`stepKeys`). El enum
 * sobre STEP_KEYS impide que devuelva claves inexistentes.
 */
const AnalysisSchema = z.object({
  recommendedStructure: z
    .string()
    .describe("The recommended legal structure, e.g. 'Sole Proprietor' or 'Stock Corporation (Sociedad Anónima)'."),
  rationale: z
    .string()
    .describe("A short, client-facing justification in English for the recommended structure."),
  stepKeys: z
    .array(z.enum(STEP_KEYS))
    .describe("The applicable formalization step keys from the catalog, in the order the user should complete them."),
})

const SYSTEM_PROMPT = `You are a business-formalization advisor for Guatemala. Given a business description and profile, you recommend a legal structure and select the applicable formalization steps from a fixed catalog.

## Legal structure rules (apply exactly)
- Solo owner (size = "solo") → "Sole Proprietor"
- Small (size = "small") → "Limited Liability Company (Sociedad de Responsabilidad Limitada)"
- Growing / anything else (size = "growing") → "Stock Corporation (Sociedad Anónima)"

## Step catalog (select and order keys from this list only)
${catalogForPrompt()}

## Instructions
- Return "stepKeys" as the ordered list of catalog keys that apply to this business. Identity, address, NIT, and SAT steps always apply. Include the deed and commercial-registry steps only for multi-owner structures (S.R.L., S.A.), never for a sole proprietor. Include the sanitary license only for food businesses.
- Order the steps in the sequence the user should complete them (identity and address first).
- Write "rationale" in English: one or two sentences explaining why the recommended structure fits this specific business. It is shown directly to the user.
- Never invent step keys — only use keys from the catalog above.`

let cachedClient: Anthropic | null = null

/** Lazy singleton; reads ANTHROPIC_API_KEY from env. Server-side only. */
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic()
  return cachedClient
}

/**
 * Test seam: inject a mock client (must expose `messages.parse`). Passing null
 * restores the real lazy singleton. Used by the unit suite to exercise the
 * enum guarantee and the fallback path without hitting the network.
 */
export function __setClientForTest(client: Anthropic | null): void {
  cachedClient = client
}

/**
 * analyzeBusiness — the single AI entry point.
 *
 * Makes one structured Claude call. On any failure (missing key, network error,
 * null parse) it falls back to deterministic local logic so the funnel never
 * breaks. Returns the roadmap plus generation metadata for persistence.
 */
export async function analyzeBusiness(
  description: string,
  profile: BusinessProfileInput,
): Promise<AnalysisResult> {
  try {
    const client = getClient()
    const message = await client.messages.parse({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: zodOutputFormat(AnalysisSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Business description: ${description}\n\nProfile:\n- Size: ${profile.size}\n- Industry: ${profile.industry}\n- City: ${profile.city || "Guatemala"}`,
        },
      ],
    })

    const parsed = message.parsed_output
    if (!parsed) return fallbackResult(description, profile)

    const steps = stepsFromKeys(parsed.stepKeys)
    // Defensive: if the model returned no resolvable steps, fall back rather
    // than persist an empty roadmap (the checklist seeds from these steps).
    if (steps.length === 0) return fallbackResult(description, profile)

    return {
      roadmap: {
        recommendedStructure: parsed.recommendedStructure,
        rationale: parsed.rationale,
        steps,
      },
      generatedBy: "ai",
      model: MODEL,
      catalogVersion: CATALOG_VERSION,
    }
  } catch {
    return fallbackResult(description, profile)
  }
}

// ---------------------------------------------------------------------------
// Fallback: the original deterministic mock, preserved verbatim in behavior.
// Marks generated_by = "fallback", model = null.
// ---------------------------------------------------------------------------

function fallbackResult(description: string, profile: BusinessProfileInput): AnalysisResult {
  const recommendedStructure = recommendStructure(profile)
  const rationale = buildRationale(description, profile, recommendedStructure)
  const steps = buildSteps(profile)
  return {
    roadmap: { recommendedStructure, rationale, steps },
    generatedBy: "fallback",
    model: null,
    catalogVersion: CATALOG_VERSION,
  }
}

function recommendStructure(profile: BusinessProfileInput): string {
  if (profile.size === "solo") return "Sole Proprietor"
  if (profile.size === "small") return "Limited Liability Company (Sociedad de Responsabilidad Limitada)"
  return "Stock Corporation (Sociedad Anónima)"
}

function buildRationale(description: string, profile: BusinessProfileInput, structure: string): string {
  const snippet = description.trim().slice(0, 80)
  return `Based on your ${profile.size === "solo" ? "single-owner" : "multi-owner"} ${
    profile.industry
  } business${snippet ? ` ("${snippet}${description.length > 80 ? "…" : ""}")` : ""} operating in ${
    profile.city || "Guatemala"
  }, a ${structure} offers the best balance of liability protection, tax simplicity, and registration cost.`
}

function buildSteps(profile: BusinessProfileInput): RoadmapStep[] {
  const base: RoadmapStep[] = [
    {
      key: "identity_verification",
      label: "Verify your identity",
      description: "Confirm your DPI (national ID) to begin the formalization process.",
      status: "pending",
      premium: false,
    },
    {
      key: "address_confirmation",
      label: "Confirm business address",
      description: "Provide and verify the physical address where your business will operate.",
      status: "pending",
      premium: false,
    },
    {
      key: "nit_registration",
      label: "Register your NIT",
      description: "Obtain your tax identification number (NIT) from SAT.",
      status: "pending",
      premium: true,
    },
    {
      key: "sat_enrollment",
      label: "Enroll with SAT",
      description: "Register as a taxpayer and select your tax regime.",
      status: "pending",
      premium: true,
    },
  ]

  if (profile.size !== "solo") {
    base.push({
      key: "deed_incorporation",
      label: "Draft incorporation deed",
      description: "Prepare the notarized deed of incorporation with a lawyer.",
      status: "pending",
      premium: true,
    })
    base.push({
      key: "commercial_registry",
      label: "Register with the Commercial Registry",
      description: "File your company with the Registro Mercantil.",
      status: "pending",
      premium: true,
    })
  }

  if (profile.industry === "food") {
    base.push({
      key: "sanitary_license",
      label: "Obtain sanitary license",
      description: "Apply for the health/sanitary permit required for food businesses.",
      status: "pending",
      premium: true,
    })
  }

  return base
}
