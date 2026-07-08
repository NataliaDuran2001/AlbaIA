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
 * Schema de salida estructurada. El modelo elige `recommendedStructure`,
 * `taxRegime`, `rationale` (texto libre) y ORDENA claves del catálogo (`stepKeys`).
 *
 * Nota: `stepKeys` se valida como `string[]` y las claves inexistentes se
 * descartan en `stepsFromKeys` (defensa en profundidad). El checklist nunca
 * recibe texto libre porque solo se siembran claves del catálogo.
 */
const AnalysisSchema = z.object({
  recommendedStructure: z
    .string()
    .min(1)
    .describe(
      "The recommended legal structure, e.g. 'Sole Proprietor (Comerciante Individual)', 'Sociedad de Emprendimiento', 'S.R.L.', or 'S.A.'.",
    ),
  taxRegime: z
    .string()
    .min(1)
    .describe(
      "The recommended Guatemalan tax regime: 'Pequeño Contribuyente', 'Régimen Opcional Simplificado', or 'Régimen Sobre las Utilidades'.",
    ),
  rationale: z
    .string()
    .min(1)
    .describe("A short, client-facing justification in English for the recommended structure and regime."),
  stepKeys: z
    .array(z.string())
    .describe("The applicable formalization step keys from the catalog, in the order the user should complete them."),
})

const SYSTEM_PROMPT = `You are a business-formalization advisor for Guatemala. Given a business description and profile, you recommend a legal structure, the best tax regime, and select the applicable formalization steps from a fixed catalog.

## Legal structure rules (apply exactly, in priority order)

1. busca_inversionistas = true → "Sociedad Anónima (S.A.)"
2. numero_socios > 20 → "Sociedad Anónima (S.A.)"
3. numero_socios between 2 and 20 AND socios_son_familia = true → "Sociedad de Responsabilidad Limitada (S.R.L.)"
4. numero_socios between 2 and 20 AND socios_son_familia = false/null → "Sociedad de Emprendimiento (S.E.) or S.R.L." — default to S.E.
5. numero_socios = 1 AND (size = "small" OR size = "growing") → "Sociedad de Emprendimiento (S.E.)"
6. numero_socios = 1 AND size = "solo" → "Comerciante Individual (Sole Proprietor)"
7. Fallback (no extended data) — use size only:
   - size = "solo" → "Sole Proprietor (Comerciante Individual)"
   - size = "small" → "Sociedad de Emprendimiento (S.E.)"
   - size = "growing" → "Sociedad Anónima (S.A.)"

## Tax regime rules (apply after structure)

- ingresos_mensuales_rango = "low" or "medium" → "Pequeño Contribuyente" (5% mensual sobre ventas brutas; límite Q500,285/año)
- ingresos_mensuales_rango = "high" → warn that they may exceed the Pequeño Contribuyente annual cap (Q500,285); suggest "Régimen Opcional Simplificado"
- ingresos_mensuales_rango = "very_high" → "Régimen Opcional Simplificado" (5%/7% ISR + 12% IVA)
- If the business likely has many deductible expenses (manufacturing, professional services) → consider "Régimen Sobre las Utilidades" (25% on profit + IVA)
- Default when no income range given → "Pequeño Contribuyente"

## Step catalog (select and order keys from this list only)
${catalogForPrompt()}

## Step selection rules

Identity, address, NIT, SAT enrollment and FEL steps always apply.
- fel_activation: always include — FEL is mandatory for every Guatemalan taxpayer.
- commercial_registry: include if working capital > Q2,000 (sole trader) OR for SE/SRL/SA.
- sociedad_emprendimiento: include ONLY if structure = S.E.
- deed_incorporation: include ONLY for S.R.L. or S.A. (NOT for sole trader or S.E.).
- accounting_books: include for S.R.L. and S.A. (recommended for S.E., optional).
- municipal_license: include if local_fisico = true (physical location open to public).
- sanitary_license: include if industry = food.
- alcohol_permit: include if vende_alcohol = true.
- igss_registration: include if numero_empleados >= 3.
- employment_contracts: include if tendra_empleados = true.
- bank_account: include for S.E., S.R.L., S.A. and recommended for sole traders.

Order steps in the sequence the user should complete them (identity and address first, licenses and contracts last).

## Output format
Respond with ONLY a JSON object, no prose, matching exactly:
{ "recommendedStructure": string, "taxRegime": string, "rationale": string, "stepKeys": string[] }`

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
 * analyzeBusiness — the single AI entry point for Phase 1.
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
    const userPrompt = buildUserPrompt(description, profile)
    const raw = await completionFn(SYSTEM_PROMPT, userPrompt)

    const parsed = AnalysisSchema.safeParse(extractJson(raw))
    if (!parsed.success) return fallbackResult(description, profile)

    const steps = stepsFromKeys(parsed.data.stepKeys)
    if (steps.length === 0) return fallbackResult(description, profile)

    return {
      roadmap: {
        recommendedStructure: parsed.data.recommendedStructure,
        taxRegime: parsed.data.taxRegime,
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

/** Build a structured user prompt from the expanded profile. */
function buildUserPrompt(description: string, p: BusinessProfileInput): string {
  const lines = [
    `Business description: ${description}`,
    ``,
    `Profile:`,
    `- Industry: ${p.industry}`,
    `- City/country: ${p.city || "Guatemala"}`,
    `- Size category: ${p.size}`,
  ]

  if (p.numero_socios !== undefined) lines.push(`- Number of owners/partners: ${p.numero_socios}`)
  if (p.socios_son_familia !== undefined) lines.push(`- Partners are family/trusted friends: ${p.socios_son_familia}`)
  if (p.busca_inversionistas !== undefined) lines.push(`- Seeking external investors / wants to issue shares: ${p.busca_inversionistas}`)
  if (p.tendra_empleados !== undefined) lines.push(`- Will hire employees: ${p.tendra_empleados}`)
  if (p.numero_empleados !== undefined) lines.push(`- Approximate number of employees: ${p.numero_empleados}`)
  if (p.vende_alcohol !== undefined) lines.push(`- Will sell alcoholic beverages: ${p.vende_alcohol}`)
  if (p.local_fisico !== undefined) lines.push(`- Physical location open to public: ${p.local_fisico}`)
  if (p.ingresos_mensuales_rango) {
    const rangoLabel: Record<string, string> = {
      low: "under Q10,000/month",
      medium: "Q10,000–Q40,000/month",
      high: "Q40,000–Q150,000/month",
      very_high: "over Q150,000/month",
    }
    lines.push(`- Expected monthly revenue: ${rangoLabel[p.ingresos_mensuales_rango] ?? p.ingresos_mensuales_rango}`)
  }

  return lines.join("\n")
}

// ── Fallback determinista ─────────────────────────────────────────────────────
// Preserva el comportamiento original cuando la API no está disponible.
// Ahora usa los campos extendidos cuando están presentes.

function fallbackResult(description: string, profile: BusinessProfileInput): AnalysisResult {
  const recommendedStructure = recommendStructure(profile)
  const taxRegime = recommendTaxRegime(profile)
  const rationale = buildRationale(description, profile, recommendedStructure)
  const steps = buildSteps(profile, recommendedStructure)
  return {
    roadmap: { recommendedStructure, taxRegime, rationale, steps },
    generatedBy: "fallback",
    model: null,
    catalogVersion: CATALOG_VERSION,
  }
}

function recommendStructure(p: BusinessProfileInput): string {
  // Priority order matches the system prompt rules
  if (p.busca_inversionistas) return "Sociedad Anónima (S.A.)"
  if (p.numero_socios !== undefined && p.numero_socios > 20) return "Sociedad Anónima (S.A.)"
  if (p.numero_socios !== undefined && p.numero_socios >= 2) {
    return p.socios_son_familia
      ? "Sociedad de Responsabilidad Limitada (S.R.L.)"
      : "Sociedad de Emprendimiento (S.E.)"
  }
  if (p.numero_socios === 1) {
    return p.size === "solo"
      ? "Sole Proprietor (Comerciante Individual)"
      : "Sociedad de Emprendimiento (S.E.)"
  }
  // Fallback: size only
  if (p.size === "solo") return "Sole Proprietor (Comerciante Individual)"
  if (p.size === "small") return "Sociedad de Emprendimiento (S.E.)"
  return "Sociedad Anónima (S.A.)"
}

function recommendTaxRegime(p: BusinessProfileInput): string {
  const rango = p.ingresos_mensuales_rango
  if (rango === "very_high") return "Régimen Opcional Simplificado sobre Ingresos"
  if (rango === "high") return "Régimen Opcional Simplificado sobre Ingresos (review if Pequeño Contribuyente annual cap applies)"
  return "Pequeño Contribuyente"
}

function buildRationale(description: string, profile: BusinessProfileInput, structure: string): string {
  const snippet = description.trim().slice(0, 80)
  const owners = profile.numero_socios === 1 ? "single-owner" : `${profile.numero_socios ?? "multi"}-owner`
  return `Based on your ${owners} ${profile.industry} business${
    snippet ? ` ("${snippet}${description.length > 80 ? "…" : ""}")` : ""
  } operating in ${profile.city || "Guatemala"}, a ${structure} offers the best balance of liability protection, tax simplicity, and registration cost.`
}

function buildSteps(profile: BusinessProfileInput, structure: string): RoadmapStep[] {
  const keys: string[] = [
    "identity_verification",
    "address_confirmation",
    "nit_registration",
    "sat_enrollment",
    "fel_activation",
  ]

  const isSE = structure.includes("Emprendimiento")
  const isSRL = structure.includes("S.R.L")
  const isSA = structure.includes("S.A.")
  const isSole = structure.includes("Individual")

  if (isSE) keys.push("sociedad_emprendimiento", "commercial_registry")
  if (isSRL || isSA) keys.push("deed_incorporation", "commercial_registry", "accounting_books")
  if (!isSole) keys.push("bank_account")

  if (profile.local_fisico) keys.push("municipal_license")
  if (profile.industry === "food") keys.push("sanitary_license")
  if (profile.vende_alcohol) keys.push("alcohol_permit")
  if (profile.tendra_empleados) keys.push("employment_contracts")
  if ((profile.numero_empleados ?? 0) >= 3) keys.push("igss_registration")

  return stepsFromKeys(keys)
}
