export type Tier = "free" | "basic" | "professional" | "enterprise"

export type BusinessSize = "solo" | "small" | "growing"
export type Industry = "retail" | "food" | "services" | "tech" | "manufacturing" | "other"
export type IngresosMensualesRango = "low" | "medium" | "high" | "very_high"

export type ChecklistStatus = "pending" | "submitted" | "approved"

// How a checklist step is completed: capturing a data value or uploading a file.
export type StepInputKind = "data" | "upload"

export interface BusinessProfileInput {
  size: BusinessSize
  industry: Industry
  city: string

  // Extended fields for the intelligent form (Phase 1)
  // These are persisted in business_profiles and used by analyzeBusiness()
  // to produce more accurate legal structure + regime + permits.

  /** Exact number of owners/partners. Determines legal structure options. */
  numero_socios?: number
  /** Partners are family or close friends → S.R.L. preferred over S.A. */
  socios_son_familia?: boolean
  /** Wants to attract investors or issue shares → S.A. */
  busca_inversionistas?: boolean
  /** Will hire employees. 3+ → mandatory IGSS employer registration. */
  tendra_empleados?: boolean
  /** Number of employees (approx). Null when tendra_empleados = false. */
  numero_empleados?: number
  /** Will sell alcoholic beverages → special permit from Gobernación. */
  vende_alcohol?: boolean
  /** Will have a physical location open to the public → municipal license. */
  local_fisico?: boolean
  /** Expected monthly revenue range — guides tax regime recommendation. */
  ingresos_mensuales_rango?: IngresosMensualesRango
}

export interface RoadmapStep {
  key: string
  label: string
  description: string
  status: ChecklistStatus
  premium: boolean
  inputKind: StepInputKind
}

export interface Roadmap {
  recommendedStructure: string
  /** Recommended Guatemalan tax regime (Pequeño Contribuyente, Simplificado, Utilidades). */
  taxRegime?: string
  rationale: string
  steps: RoadmapStep[]
}

export interface ChecklistItem {
  id: string
  key: string
  title: string
  status: ChecklistStatus
  premium: boolean
  sort_order: number
  inputKind: StepInputKind
  // For "data" steps: the field label + placeholder from the catalog, so the UI
  // can render a labeled input without shipping the whole catalog to the client.
  dataLabel?: string
  dataPlaceholder?: string
  // For "data" steps: whether the user has already saved a value. The plaintext
  // value is never sent to the client — only this boolean flag is derived server-side.
  hasData?: boolean
}

export interface AppDocument {
  id: string
  checklist_item_id: string | null
  storage_path: string
  status: string
  uploaded_at: string
}

export interface Subscription {
  user_id: string
  tier: Tier
  stripe_customer_id: string | null
  status: string
  current_period_end: string | null
}

export interface ConsultationCredit {
  id: string
  kind: "lawyer" | "accountant"
  remaining: number
}

export type Feature =
  | "checklist_basic"
  | "checklist_full"
  | "roadmap"
  | "document_upload_id"
  | "document_upload_all"
  | "ai_validation"
  | "ai_consultant"
  | "specialist_call"
  | "partner_scheduling"
