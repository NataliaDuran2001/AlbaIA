/**
 * Smoke test EN VIVO del proveedor de IA (chatbot + análisis de roadmap).
 *
 * Ejercita el código real (lib/ai/openrouter.ts y lib/ai/analyze.ts) contra la
 * API real, leyendo las AI_* de .env.local. Úsalo para validar una key o un
 * modelo nuevo sin levantar la app:
 *
 *   node --experimental-strip-types --import ./tests/unit/resolver.mjs scripts/smoke-ai.mts
 *
 * Salidas esperadas:
 *   - "chatCompletion: MODULE_OK" y "generatedBy: ai"  → todo funciona.
 *   - Error 401 → la key es inválida.
 *   - Error 404 "Model not found" → el AI_MODEL no existe/no está desplegado
 *     en tu cuenta; elige uno serverless disponible en tu proveedor.
 *   - "generatedBy: fallback" → la llamada falló y actuó el fallback (revisa
 *     el error impreso arriba).
 */
import { readFileSync } from "node:fs"

// Carga .env.local (node no lo lee fuera de Next). No pisa vars ya seteadas.
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  console.error("No se encontró .env.local — copia .env.example y rellena las AI_*.")
  process.exit(1)
}

const { available, chatCompletion, DEFAULT_MODEL } = await import("../lib/ai/openrouter.ts")
const { analyzeBusiness } = await import("../lib/ai/analyze.ts")

console.log("available():", available())
console.log("model:", DEFAULT_MODEL)

try {
  const reply = await chatCompletion([{ role: "user", content: "Reply with exactly: MODULE_OK" }], {
    maxTokens: 20,
  })
  console.log("chatCompletion:", reply)
} catch (err) {
  console.error("chatCompletion FALLÓ:", (err as Error).message)
}

// analyzeBusiness nunca lanza: si la API falla, cae al fallback determinista.
const result = await analyzeBusiness("A small bakery selling custom cakes and coffee", {
  size: "solo",
  industry: "food",
  city: "Guatemala City",
})
console.log("analyze.generatedBy:", result.generatedBy, "| model:", result.model)
console.log("analyze.structure:", result.roadmap.recommendedStructure)
console.log("analyze.stepKeys:", result.roadmap.steps.map((s) => s.key).join(", "))
