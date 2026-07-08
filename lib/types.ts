export type Tier = "free" | "basic" | "professional" | "enterprise"

export type BusinessSize = "solo" | "small" | "growing"
export type Industry = "retail" | "food" | "services" | "tech" | "manufacturing" | "other"

export type ChecklistStatus = "pending" | "submitted" | "approved"

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
