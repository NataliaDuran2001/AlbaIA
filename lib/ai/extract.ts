// lib/ai/extract.ts
//
// Extrae datos estructurados del negocio a partir del texto libre que el
// usuario escribió en el paso 1 (idea_text). Resultado usado para pre-llenar
// el formulario de perfil (Paso 2) sin que el usuario tenga que repetir
// información que ya mencionó.
//
// Si la IA no está configurada o falla, devuelve un objeto vacío
// (el formulario queda en blanco como antes) — nunca rompe el flujo.

import "server-only"
import { z } from "zod"
import { available as aiAvailable, chatCompletion } from "@/lib/ai/openrouter"
import type { Industry, IngresosMensualesRango } from "@/lib/types"

export interface ExtractedProfile {
  industry?: Industry
  numero_socios?: number
  tendra_empleados?: boolean
  numero_empleados?: number
  vende_alcohol?: boolean
  local_fisico?: boolean
  ingresos_mensuales_rango?: IngresosMensualesRango
  /** Keys that were successfully auto-detected (shown with "AI detected" badge). */
  detected: string[]
}

const ExtractionSchema = z.object({
  industry: z
    .enum(["retail", "food", "services", "tech", "manufacturing", "other"])
    .nullable()
    .describe("Sector of the business. null if uncertain."),
  numero_socios: z
    .number()
    .int()
    .min(1)
    .nullable()
    .describe("Total number of owners/partners mentioned. null if not mentioned."),
  tendra_empleados: z
    .boolean()
    .nullable()
    .describe("True if the description mentions having employees or staff. null if not mentioned."),
  numero_empleados: z
    .number()
    .int()
    .min(1)
    .nullable()
    .describe("Number of employees explicitly mentioned. null if not mentioned."),
  vende_alcohol: z
    .boolean()
    .nullable()
    .describe("True only if alcoholic beverages (beer, wine, liquor) are explicitly mentioned. null otherwise."),
  local_fisico: z
    .boolean()
    .nullable()
    .describe("True if a physical location open to customers (store, restaurant, office) is mentioned. null if uncertain."),
  ingresos_mensuales_rango: z
    .enum(["low", "medium", "high", "very_high"])
    .nullable()
    .describe(
      "Estimated monthly revenue range if inferable from context. low=<Q10k, medium=Q10k-Q40k, high=Q40k-Q150k, very_high=>Q150k. null if not mentioned.",
    ),
})

const SYSTEM_PROMPT = `You are an information extractor. Given a business idea description, extract structured facts about the business.

Return ONLY a valid JSON object. Use null for any field that cannot be confidently inferred — never guess.

Field guidance:
- industry: retail (selling products), food (restaurants/food/beverages), services (professional services, consulting, freelance), tech (software, apps, digital products), manufacturing (producing physical goods), other
- numero_socios: count mentions of partners, co-founders, "we"/"nosotros"/"socios". Default to 1 if "I"/"yo" with no partners.
- tendra_empleados: true if employees, workers, staff, dependientes, empleados are mentioned.
- numero_empleados: extract the number if explicitly stated.
- vende_alcohol: true ONLY if beer, wine, liquor, alcohol, cerveza, vino, licor are explicitly mentioned.
- local_fisico: true if a physical store, restaurant, market stall, workshop, or office is mentioned. false if "online only" / "digital" / "from home" without public access.
- ingresos_mensuales_rango: only if revenue amounts or scale hints are explicitly mentioned.`

/**
 * Extracts a partial business profile from the user's free-text idea description.
 * Returns an empty ExtractedProfile (detected=[]) if AI is unavailable or fails.
 */
export async function extractFromIdea(ideaText: string): Promise<ExtractedProfile> {
  if (!ideaText?.trim() || !aiAvailable()) {
    return { detected: [] }
  }

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Business idea: "${ideaText.trim().slice(0, 800)}"`,
        },
      ],
      { maxTokens: 512, temperature: 0, json: true },
    )

    // Extract JSON from the response (tolerates code fences)
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidate = fenced ? fenced[1] : raw
    const start = candidate.indexOf("{")
    const end = candidate.lastIndexOf("}")
    if (start === -1 || end === -1) return { detected: [] }

    const parsed = ExtractionSchema.safeParse(JSON.parse(candidate.slice(start, end + 1)))
    if (!parsed.success) return { detected: [] }

    const data = parsed.data
    const result: ExtractedProfile = { detected: [] }

    // Only populate fields where the model returned a non-null value
    if (data.industry !== null)               { result.industry = data.industry;                              result.detected.push("industry") }
    if (data.numero_socios !== null)          { result.numero_socios = data.numero_socios;                    result.detected.push("owners") }
    if (data.tendra_empleados !== null)       { result.tendra_empleados = data.tendra_empleados;             result.detected.push("employees") }
    if (data.numero_empleados !== null)       { result.numero_empleados = data.numero_empleados;             result.detected.push("employeeCount") }
    if (data.vende_alcohol !== null)          { result.vende_alcohol = data.vende_alcohol;                   result.detected.push("alcohol") }
    if (data.local_fisico !== null)           { result.local_fisico = data.local_fisico;                     result.detected.push("local") }
    if (data.ingresos_mensuales_rango !== null) { result.ingresos_mensuales_rango = data.ingresos_mensuales_rango; result.detected.push("revenue") }

    return result
  } catch {
    return { detected: [] }
  }
}
