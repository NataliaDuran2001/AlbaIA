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
export const CATALOG_VERSION = "2026-07-08.2"

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

export const STEP_CATALOG = {
  // ── Identidad y domicilio (siempre requeridos) ────────────────────────────
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

  // ── SAT / Régimen tributario ──────────────────────────────────────────────
  nit_registration: {
    label: "Register your NIT",
    description: "Obtain your tax identification number (NIT) from SAT via Agencia Virtual (free, online).",
    premium: true,
    inputKind: "data",
    dataLabel: "NIT number",
    dataPlaceholder: "e.g. 1234567-8",
    sensitive: true,
    appliesTo: "Always required. Every taxpayer needs a NIT.",
  },
  sat_enrollment: {
    label: "Enroll with SAT",
    description: "Register as a taxpayer and select your tax regime (Pequeño Contribuyente, Simplificado, or Utilidades).",
    premium: true,
    inputKind: "data",
    dataLabel: "SAT tax regime",
    dataPlaceholder: "e.g. Pequeño Contribuyente",
    appliesTo: "Always required. Every business must enroll with SAT and pick a tax regime.",
  },
  fel_activation: {
    label: "Activate electronic invoicing (FEL)",
    description: "Enable Factura Electrónica (FEL) in SAT's Agencia Virtual. Mandatory for all businesses, free to set up.",
    premium: false,
    inputKind: "data",
    dataLabel: "FEL status",
    dataPlaceholder: "e.g. Activated on portal.sat.gob.gt",
    appliesTo: "Always required. FEL is mandatory for every taxpayer from day one.",
  },

  // ── Registro Mercantil ────────────────────────────────────────────────────
  commercial_registry: {
    label: "Register with the Commercial Registry",
    description: "File your company with the Registro Mercantil (registromercantil.gob.gt). Required if working capital exceeds Q2,000 (sole trader) or for any formal company.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required for: (a) sole traders with working capital > Q2,000, and (b) all formal companies (SE, S.R.L., S.A.).",
  },

  // ── Sociedad de Emprendimiento (SE) ───────────────────────────────────────
  sociedad_emprendimiento: {
    label: "Register as Sociedad de Emprendimiento",
    description: "Create your company online at minegocio.gt — no notary needed. Based on Decree 20-2018. Fast and low cost.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required only for Sociedad de Emprendimiento (SE). Not for sole traders, S.R.L., or S.A.",
  },

  // ── Escrituras notariales (SRL / SA) ─────────────────────────────────────
  deed_incorporation: {
    label: "Draft incorporation deed",
    description: "Prepare the notarized deed of incorporation with a licensed notary. All capital must be fully paid at signing.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required for multi-owner legal structures (S.R.L., S.A.). NOT needed for a sole proprietor or SE.",
  },
  accounting_books: {
    label: "Authorize accounting & corporate books",
    description: "Register your accounting and corporate record books with the Registro Mercantil. Required for formal companies.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required for S.R.L. and S.A. (and recommended for SE). Not required for sole traders.",
  },

  // ── Licencias especiales ──────────────────────────────────────────────────
  municipal_license: {
    label: "Obtain municipal business license",
    description: "Get the operating license (licencia municipal) from your local municipality. Required for any location open to the public or with visible signage.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required for any business with a physical location open to the public or with commercial signage. Rates vary by municipality.",
  },
  sanitary_license: {
    label: "Obtain sanitary license",
    description: "Apply for the health/sanitary permit from the Ministerio de Salud (MSPAS). Required for businesses that prepare or sell food.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required only for food & beverage businesses (industry = food). Not needed for retail-only or service businesses.",
  },
  alcohol_permit: {
    label: "Obtain alcohol sales permit",
    description: "Apply for the permit to sell alcoholic beverages from the Ministerio de Gobernación. Required in addition to other licenses.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required only for businesses that sell alcoholic beverages (vende_alcohol = true). Requires a separate permit from Gobernación.",
  },

  // ── Empleo / IGSS ─────────────────────────────────────────────────────────
  igss_registration: {
    label: "Register with IGSS (social security)",
    description: "Register as an employer with the Instituto Guatemalteco de Seguridad Social. Mandatory when you have 3 or more employees. Employer contribution: ~12.67% of wages.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required when the business has 3 or more employees (numero_empleados >= 3). Not required for businesses with fewer than 3 employees.",
  },
  employment_contracts: {
    label: "Draft employment contracts",
    description: "Prepare written employment contracts for each worker, respecting Guatemala's minimum wage. Required under the Código de Trabajo.",
    premium: true,
    inputKind: "upload",
    appliesTo: "Required for any business with employees (tendra_empleados = true). Written contracts and minimum wage are mandatory from the first employee.",
  },

  // ── Cuenta bancaria (recomendado para todos) ──────────────────────────────
  bank_account: {
    label: "Open a business bank account",
    description: "Open a business bank account to separate personal and business finances. Required for formal companies; strongly recommended for all.",
    premium: false,
    inputKind: "data",
    dataLabel: "Bank name",
    dataPlaceholder: "e.g. Banco Industrial, BAM, G&T Continental",
    appliesTo: "Strongly recommended for all businesses. Required for SE, S.R.L., and S.A. to handle company funds separately from personal assets.",
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
