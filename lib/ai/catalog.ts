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

interface CatalogEntry {
  label: string
  description: string
  premium: boolean
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
    appliesTo: "Always required. First step for any business, any size or industry.",
  },
  address_confirmation: {
    label: "Confirm business address",
    description: "Provide and verify the physical address where your business will operate.",
    premium: false,
    appliesTo: "Always required. Applies to every business.",
  },
  nit_registration: {
    label: "Register your NIT",
    description: "Obtain your tax identification number (NIT) from SAT.",
    premium: true,
    appliesTo: "Always required. Every taxpayer needs a NIT.",
  },
  sat_enrollment: {
    label: "Enroll with SAT",
    description: "Register as a taxpayer and select your tax regime.",
    premium: true,
    appliesTo: "Always required. Every business must enroll with SAT and pick a tax regime.",
  },
  deed_incorporation: {
    label: "Draft incorporation deed",
    description: "Prepare the notarized deed of incorporation with a lawyer.",
    premium: true,
    appliesTo:
      "Required for multi-owner legal structures (S.R.L., S.A.). NOT needed for a sole proprietor (comerciante individual).",
  },
  commercial_registry: {
    label: "Register with the Commercial Registry",
    description: "File your company with the Registro Mercantil.",
    premium: true,
    appliesTo:
      "Required for companies (S.R.L., S.A.) that must be filed with the Registro Mercantil. NOT needed for a sole proprietor.",
  },
  sanitary_license: {
    label: "Obtain sanitary license",
    description: "Apply for the health/sanitary permit required for food businesses.",
    premium: true,
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
  for (const key of keys) {
    const entry = STEP_CATALOG[key as StepKey]
    if (!entry) continue
    steps.push({
      key,
      label: entry.label,
      description: entry.description,
      status: "pending",
      premium: entry.premium,
    })
  }
  return steps
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
