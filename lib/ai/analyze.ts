import "server-only"
import { z } from "zod"
import type { BusinessProfileInput, Roadmap, RoadmapStep } from "@/lib/types"
import { CATALOG_VERSION, catalogForPrompt, stepsFromKeys } from "@/lib/ai/catalog"
import { DEFAULT_MODEL, available as openRouterAvailable, chatCompletion } from "@/lib/ai/openrouter"

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
 * Schema de salida estructurada. El modelo elige `recommendedStructure` y
 * `rationale` (texto libre) y ORDENA claves del catálogo (`stepKeys`).
 *
 * Nota: a diferencia del path anterior con Anthropic (que restringía la
 * generación al enum), aquí `stepKeys` se valida como `string[]` y las claves
 * inexistentes se descartan en `stepsFromKeys` (defensa en profundidad). El
 * checklist nunca recibe texto libre porque solo se siembran claves del catálogo.
 */
const AnalysisSchema = z.object({
  recommendedStructure: z
    .string()
    .min(1)
    .describe("The recommended legal structure, e.g. 'Sole Proprietor' or 'Stock Corporation (Sociedad Anónima)'."),
  rationale: z
    .string()
    .min(1)
    .describe("A short, client-facing justification in English for the recommended structure."),
  stepKeys: z
    .array(z.string())
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
- Never invent step keys — only use keys from the catalog above.

## Output format
Respond with ONLY a JSON object, no prose, matching exactly:
{ "recommendedStructure": string, "rationale": string, "stepKeys": string[] }`

/**
 * Completion function used to reach the model. Defaults to OpenRouter; the unit
 * suite swaps it (via __setCompletionForTest) to exercise the schema guarantee
 * and the fallback path without hitting the network.
 */
type CompletionFn = (system: string, user: string) => Promise<string>

const defaultCompletion: CompletionFn = (system, user) =>
  chatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 2048, temperature: 0, json: true },
  )

let completionFn: CompletionFn = defaultCompletion

/**
 * Test seam: inject a completion function. Passing null restores the real
 * OpenRouter-backed default.
 */
export function __setCompletionForTest(fn: CompletionFn | null): void {
  completionFn = fn ?? defaultCompletion
}

/** Extract the first JSON object from a model reply (tolerates code fences/prose). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON object in reply.")
  return JSON.parse(candidate.slice(start, end + 1))
}

/**
 * analyzeBusiness — the single AI entry point.
 *
 * Makes one structured model call via OpenRouter. On any failure (missing key,
 * network error, invalid JSON, schema mismatch) it falls back to deterministic
 * local logic so the funnel never breaks. Returns the roadmap plus generation
 * metadata for persistence.
 */
export async function analyzeBusiness(
  description: string,
  profile: BusinessProfileInput,
): Promise<AnalysisResult> {
  // No key and no test override → deterministic fallback.
  if (completionFn === defaultCompletion && !openRouterAvailable()) {
    return fallbackResult(description, profile)
  }

  try {
    const userPrompt = `Business description: ${description}\n\nProfile:\n- Size: ${profile.size}\n- Industry: ${profile.industry}\n- City: ${profile.city || "Guatemala"}`
    const raw = await completionFn(SYSTEM_PROMPT, userPrompt)

    // Validate against the same Zod schema; the enum on STEP_KEYS drops any key
    // the model invents, so the checklist never receives free text.
    const parsed = AnalysisSchema.safeParse(extractJson(raw))
    if (!parsed.success) return fallbackResult(description, profile)

    const steps = stepsFromKeys(parsed.data.stepKeys)
    // Defensive: if the model returned no resolvable steps, fall back rather
    // than persist an empty roadmap (the checklist seeds from these steps).
    if (steps.length === 0) return fallbackResult(description, profile)

    return {
      roadmap: {
        recommendedStructure: parsed.data.recommendedStructure,
        rationale: parsed.data.rationale,
        steps,
      },
      generatedBy: "ai",
      model: DEFAULT_MODEL,
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
  // Select the applicable catalog keys deterministically, then resolve labels,
  // descriptions, premium flags and inputKind from the single catalog source of
  // truth (stepsFromKeys). Keeps the fallback in lockstep with the AI path.
  const keys: string[] = ["identity_verification", "address_confirmation", "nit_registration", "sat_enrollment"]

  if (profile.size !== "solo") {
    keys.push("deed_incorporation", "commercial_registry")
  }
  if (profile.industry === "food") {
    keys.push("sanitary_license")
  }

  return stepsFromKeys(keys)
}
