import type { RoadmapStep } from "@/lib/types"

/**
 * Catálogo de trámites de formalización (Guatemala).
 *
 * Contenido regulatorio curado por humanos y versionado en git — NO vive en la
 * BD. El modelo de IA solo SELECCIONA Y ORDENA `key`s de este catálogo (vía el
 * enum de `STEP_KEYS` en el schema de salida). Los labels, descriptions y el
 * flag `premium` se resuelven SIEMPRE desde aquí en código; el modelo nunca
 * redacta contenido regulatorio.
 *
 * Bump manual de CATALOG_VERSION al editar este archivo — se persiste con cada
 * roadmap para trazabilidad (qué versión del catálogo generó cada análisis).
 */
export const CATALOG_VERSION = "2026-07-08.1"

/**
 * Cómo completa el usuario el paso:
 * - "data"     → captura un dato (DPI, NIT, dirección) en un input de texto.
 *                El valor se cifra en reposo (AES-256-GCM) por ser sensible.
 * - "upload"   → sube un documento (escritura notarial, licencia, etc.).
 */
export type StepInputKind = "data" | "upload"

interface CatalogEntry {
  label: string
  description: string
  premium: boolean
  /** Cómo se completa: capturar un dato o subir un documento. */
  inputKind: StepInputKind
  /** Etiqueta del campo cuando inputKind = "data" (p. ej. "DPI number"). */
  dataLabel?: string
  /** Placeholder del input cuando inputKind = "data". */
  dataPlaceholder?: string
  /** true si el dato capturado es sensible y debe cifrarse en reposo. */
  sensitive?: boolean
  /**
   * Guía de aplicabilidad para el system prompt: cuándo procede este paso.
   * No se muestra al usuario; orienta la selección del modelo.
   */
  appliesTo: string
}

/**
 * Semilla: los 7 pasos hardcodeados en el mock original de `buildSteps`.
 * El orden de las claves aquí es solo de referencia; el modelo decide el orden
 * final del roadmap.
 */
export const STEP_CATALOG = {
  identity_verification: {
    label: "Verify your identity",
    description: "Confirm your DPI (national ID) to begin the formalization process.",
    premium: false,
    inputKind: "data",
    dataLabel: "DPI number",
    dataPlaceholder: "e.g. 1234 56789 0101",
    sensitive: true,
    appliesTo: "Always required. First step for any business, any size or industry.",
  },
  address_confirmation: {
    label: "Confirm business address",
    description: "Provide and verify the physical address where your business will operate.",
    premium: false,
    inputKind: "data",
    dataLabel: "Business address",
    dataPlaceholder: "e.g. 5a Avenida 1-23, Zona 10, Guatemala City",
    sensitive: true,
    appliesTo: "Always required. Applies to every business.",
  },
  nit_registration: {
    label: "Register your NIT",
    description: "Obtain your tax identification number (NIT) from SAT.",
    premium: true,
    inputKind: "data",
    dataLabel: "NIT number",
    dataPlaceholder: "e.g. 1234567-8",
    sensitive: true,
    appliesTo: "Always required. Every taxpayer needs a NIT.",
  },
  sat_enrollment: {
    label: "Enroll with SAT",
    description: "Register as a taxpayer and select your tax regime.",
    premium: true,
    inputKind: "data",
    dataLabel: "SAT tax regime",
    dataPlaceholder: "e.g. Pequeño Contribuyente",
    appliesTo: "Always required. Every business must enroll with SAT and pick a tax regime.",
  },
  deed_incorporation: {
    label: "Draft incorporation deed",
    description: "Prepare the notarized deed of incorporation with a lawyer.",
    premium: true,
    inputKind: "upload",
    appliesTo:
      "Required for multi-owner legal structures (S.R.L., S.A.). NOT needed for a sole proprietor (comerciante individual).",
  },
  commercial_registry: {
    label: "Register with the Commercial Registry",
    description: "File your company with the Registro Mercantil.",
    premium: true,
    inputKind: "upload",
    appliesTo:
      "Required for companies (S.R.L., S.A.) that must be filed with the Registro Mercantil. NOT needed for a sole proprietor.",
  },
  sanitary_license: {
    label: "Obtain sanitary license",
    description: "Apply for the health/sanitary permit required for food businesses.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required only for food & beverage businesses (industry = food).",
  },
} as const satisfies Record<string, CatalogEntry>

/**
 * Tupla de claves válidas — usada para construir el enum de Zod en el schema de
 * salida. `z.enum(STEP_KEYS)` garantiza que el modelo solo pueda devolver claves
 * que existen en el catálogo, lo que a su vez garantiza que el checklist
 * (sembrado desde `roadmap.steps`) nunca reciba texto libre.
 */
export const STEP_KEYS = Object.keys(STEP_CATALOG) as [StepKey, ...StepKey[]]

export type StepKey = keyof typeof STEP_CATALOG

/**
 * Resuelve una lista ordenada de claves a `RoadmapStep[]`, tomando label,
 * description y premium del catálogo. Ignora claves desconocidas por seguridad
 * (el enum ya las descarta, pero esto blinda contra desalineación de tipos).
 * Todos los pasos arrancan en `status: "pending"`.
 */
export function stepsFromKeys(keys: readonly string[]): RoadmapStep[] {
  const steps: RoadmapStep[] = []
  // Dedupe by key: the model can return the same catalog key twice, which would
  // otherwise seed duplicate checklist rows. First occurrence wins (keeps order).
  const seen = new Set<string>()
  for (const key of keys) {
    const entry = STEP_CATALOG[key as StepKey]
    if (!entry || seen.has(key)) continue
    seen.add(key)
    steps.push({
      key,
      label: entry.label,
      description: entry.description,
      status: "pending",
      premium: entry.premium,
      inputKind: entry.inputKind,
    })
  }
  return steps
}

/** Catalog metadata for a key, or undefined if unknown. Used by the checklist UI. */
export function catalogEntry(key: string): CatalogEntry | undefined {
  return STEP_CATALOG[key as StepKey]
}

/**
 * Bloque de catálogo para el system prompt. Enumera cada clave con su
 * aplicabilidad para que el modelo elija y ordene correctamente.
 */
export function catalogForPrompt(): string {
  return (Object.keys(STEP_CATALOG) as StepKey[])
    .map((key) => `- ${key}: ${STEP_CATALOG[key].label}. ${STEP_CATALOG[key].appliesTo}`)
    .join("\n")
}
