/**
 * Validación integral de la configuración de AlbaIA (entorno LOCAL).
 *
 * Un solo comando que verifica, de punta a punta y contra los servicios reales,
 * que todo lo necesario para que la app funcione con IA + datos cifrados esté OK:
 *
 *   1. Variables de entorno presentes (.env.local)
 *   2. Cifrado AES-256-GCM: la clave decodifica a 32 bytes y el roundtrip funciona
 *   3. Supabase: conexión con la service-role key
 *   4. Esquema: columnas de las migraciones 0001 (roadmaps IA) y 0002 (checklist)
 *   5. IA en vivo: el modelo configurado responde y analyzeBusiness da generatedBy=ai
 *
 * Uso:
 *   node --experimental-strip-types --import ./tests/unit/resolver.mjs scripts/validate-setup.mts
 *
 * Lee .env.local por defecto. Para validar OTRO entorno (p. ej. copiar las env
 * vars de Vercel a un archivo y verificarlas), pasa la ruta:
 *   node ... scripts/validate-setup.mts .env.production.check
 *
 * Salida: cada chequeo imprime [ OK ] / [FALLA] / [ -- ] (omitido). Exit code 0
 * si todo lo crítico pasó, 1 si algo crítico falló.
 */
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

// --- carga del archivo de entorno (node no lee .env.local fuera de Next) ---
const ENV_FILE = process.argv[2] || ".env.local"
try {
  const text = readFileSync(new URL(`../${ENV_FILE}`, import.meta.url), "utf8")
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
} catch {
  console.error(`No se pudo leer ${ENV_FILE}. Copia .env.example y rellena los valores.`)
  process.exit(1)
}

// --- helpers de reporte ---
let failed = 0
const ok = (label: string, extra = "") => console.log(`[ OK ] ${label}${extra ? "  — " + extra : ""}`)
const bad = (label: string, extra = "") => {
  failed++
  console.log(`[FALLA] ${label}${extra ? "  — " + extra : ""}`)
}
const skip = (label: string, extra = "") => console.log(`[ -- ] ${label}${extra ? "  — " + extra : ""}`)
const section = (t: string) => console.log(`\n=== ${t} ===`)

// ---------------------------------------------------------------------------
// 1. Variables de entorno
// ---------------------------------------------------------------------------
section("1. Variables de entorno")
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATA_ENCRYPTION_KEY",
  "AI_API_KEY",
  "AI_BASE_URL",
  "AI_MODEL",
]
for (const name of REQUIRED) {
  const v = process.env[name]
  if (v && v.trim()) ok(name, `presente (${v.trim().length} chars)`)
  else bad(name, "ausente o vacío")
}

// ---------------------------------------------------------------------------
// 2. Cifrado AES-256-GCM
// ---------------------------------------------------------------------------
section("2. Cifrado (DATA_ENCRYPTION_KEY)")
try {
  const { encryptionAvailable, encrypt, decrypt, isEncrypted } = await import("../lib/crypto/encryption.ts")
  if (!encryptionAvailable()) {
    bad("clave de cifrado", "encryptionAvailable() = false (no decodifica a 32 bytes)")
  } else {
    const sample = "DPI:1234567890101 · dato sensible de prueba"
    const ct = encrypt(sample)
    const rt = decrypt(ct)
    if (rt === sample && isEncrypted(ct)) {
      const raw = process.env.DATA_ENCRYPTION_KEY!.trim()
      const fp = createHash("sha256").update(raw).digest("hex").slice(0, 8)
      ok("roundtrip encrypt→decrypt", `huella clave: ${fp} (compárala entre local y Vercel)`)
    } else {
      bad("roundtrip encrypt→decrypt", "el texto descifrado no coincide con el original")
    }
  }
} catch (e) {
  bad("módulo de cifrado", (e as Error).message)
}

// ---------------------------------------------------------------------------
// 3 + 4. Supabase: conexión y esquema
// ---------------------------------------------------------------------------
section("3. Supabase — conexión y esquema")
let supabase: import("@supabase/supabase-js").SupabaseClient | null = null
try {
  const { createClient } = await import("@supabase/supabase-js")
  supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  // Conexión: una lectura trivial confirma URL + service-role key válidas.
  const { error } = await supabase.from("roadmaps").select("id").limit(1)
  if (error) bad("conexión a Supabase", error.message)
  else ok("conexión a Supabase", "service-role key válida, tabla roadmaps accesible")
} catch (e) {
  bad("cliente Supabase", (e as Error).message)
}

if (supabase) {
  // Esquema: columnas que deben existir según las migraciones aplicadas.
  const EXPECTED: Record<string, string[]> = {
    roadmaps: ["rationale", "generated_by", "model", "catalog_version"], // migración 0001
    checklist_items: ["input_kind", "data_value", "data_is_sensitive"], //  migración 0002
  }
  for (const [table, cols] of Object.entries(EXPECTED)) {
    // Seleccionar las columnas; si alguna no existe, Supabase devuelve error nombrándola.
    const { error } = await supabase.from(table).select(cols.join(",")).limit(1)
    if (error) bad(`esquema ${table}`, error.message)
    else ok(`esquema ${table}`, `columnas presentes: ${cols.join(", ")}`)
  }
}

// ---------------------------------------------------------------------------
// 5. IA en vivo
// ---------------------------------------------------------------------------
section("5. IA en vivo (Fireworks / proveedor configurado)")
try {
  const { available, chatCompletion, DEFAULT_MODEL } = await import("../lib/ai/openrouter.ts")
  if (!available()) {
    bad("proveedor de IA", "available() = false — falta AI_API_KEY")
  } else {
    console.log(`       modelo: ${DEFAULT_MODEL}`)
    // Prueba directa del endpoint (aísla problemas de key/modelo).
    try {
      await chatCompletion([{ role: "user", content: "Reply with the single word: OK" }], { maxTokens: 20 })
      ok("chatCompletion", "el modelo respondió (key + modelo válidos)")
    } catch (e) {
      bad("chatCompletion", (e as Error).message)
    }
    // Prueba de la tarea real del roadmap.
    const { analyzeBusiness } = await import("../lib/ai/analyze.ts")
    const res = await analyzeBusiness("A small bakery selling custom cakes and coffee", {
      size: "small",
      industry: "food",
      city: "Guatemala City",
    })
    if (res.generatedBy === "ai") {
      ok("analyzeBusiness", `generatedBy=ai, model=${res.model}, ${res.roadmap.steps.length} pasos`)
    } else {
      bad("analyzeBusiness", "generatedBy=fallback — la llamada de IA falló (ver error de chatCompletion arriba)")
    }
  }
} catch (e) {
  bad("módulo de IA", (e as Error).message)
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
section("Resumen")
if (failed === 0) {
  console.log("✅ TODO OK — la configuración está lista para probar.")
  process.exit(0)
} else {
  console.log(`❌ ${failed} chequeo(s) fallaron. Revisa las líneas [FALLA] de arriba.`)
  process.exit(1)
}
