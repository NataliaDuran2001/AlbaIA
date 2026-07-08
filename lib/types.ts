export type Tier = "free" | "basic" | "professional" | "enterprise"

export type BusinessSize = "solo" | "small" | "growing"
export type Industry = "retail" | "food" | "services" | "tech" | "manufacturing" | "other"

export type ChecklistStatus = "pending" | "submitted" | "approved"

// How a checklist step is completed: capturing a data value or uploading a file.
export type StepInputKind = "data" | "upload"

export interface BusinessProfileInput {
  size: BusinessSize
  industry: Industry
  city: string
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
