import "server-only"
import { createClient } from "@/lib/supabase/server"
import { catalogEntry } from "@/lib/ai/catalog"
import { decrypt, isEncrypted } from "@/lib/crypto/encryption"
import type { ChecklistItem, ConsultationCredit, Roadmap, Subscription, Tier } from "@/lib/types"

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient()
  const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle()
  return (data as Subscription) ?? null
}

export async function getTier(userId: string): Promise<Tier> {
  const sub = await getSubscription(userId)
  return sub?.tier ?? "free"
}

export async function getBusinessProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// The selected country is stored in business_profiles.city (see profile-form).
export async function getUserCountry(userId: string): Promise<string | null> {
  const profile = await getBusinessProfile(userId)
  const value = (profile as { city?: string | null } | null)?.city
  return value ?? null
}

export async function getRoadmap(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id as string,
    recommendedStructure: data.recommended_structure as string,
    rationale: (data.rationale as string | null) ?? null,
    steps: (data.steps as Roadmap["steps"]) ?? [],
  }
}

interface ChecklistRow {
  id: string
  key: string
  title: string
  status: ChecklistItem["status"]
  premium: boolean
  sort_order: number
  input_kind: "data" | "upload" | null
  data_value: string | null
  data_is_sensitive: boolean | null
}

export async function getChecklistItems(userId: string): Promise<ChecklistItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("checklist_items")
    .select("id, key, title, status, premium, sort_order, input_kind, data_value, data_is_sensitive")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })

  const rows = (data as ChecklistRow[] | null) ?? []
  // Derive `hasData` server-side; the plaintext/ciphertext of data_value is NEVER
  // sent to the client. Only the boolean flag crosses the network boundary.
  return rows.map((r) => {
    const inputKind = r.input_kind ?? "upload"
    const entry = catalogEntry(r.key)
    return {
      id: r.id,
      key: r.key,
      title: r.title,
      status: r.status,
      premium: r.premium,
      sort_order: r.sort_order,
      inputKind,
      dataLabel: inputKind === "data" ? entry?.dataLabel : undefined,
      dataPlaceholder: inputKind === "data" ? entry?.dataPlaceholder : undefined,
      hasData: !!r.data_value,
    }
  })
}

export interface CapturedDatum {
  id: string
  key: string
  title: string
  /** Field label from the catalog, e.g. "DPI number". */
  label: string
  /** Masked for display: sensitive values show only the last characters. */
  display: string
  sensitive: boolean
  status: ChecklistItem["status"]
}

/** Mask a sensitive value: keep the last 4 visible, replace the rest with dots. */
function maskValue(value: string): string {
  const tail = value.slice(-4)
  const dots = "•".repeat(Math.max(4, Math.min(value.length - tail.length, 8)))
  return value.length <= 4 ? value : `${dots} ${tail}`
}

/**
 * Captured "data" steps for the Documents page. Decrypts sensitive values on the
 * server and MASKS them before returning — full plaintext is never sent to the
 * client. Non-sensitive values (e.g. tax regime) are shown in full.
 */
export async function getCapturedData(userId: string): Promise<CapturedDatum[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("checklist_items")
    .select("id, key, title, status, input_kind, data_value, data_is_sensitive")
    .eq("user_id", userId)
    .eq("input_kind", "data")
    .not("data_value", "is", null)
    .order("sort_order", { ascending: true })

  const rows =
    (data as
      | {
          id: string
          key: string
          title: string
          status: ChecklistItem["status"]
          data_value: string | null
          data_is_sensitive: boolean | null
        }[]
      | null) ?? []

  return rows.map((r) => {
    const entry = catalogEntry(r.key)
    const sensitive = r.data_is_sensitive === true
    let plain = r.data_value ?? ""
    if (sensitive && isEncrypted(plain)) {
      try {
        plain = decrypt(plain)
      } catch {
        plain = ""
      }
    }
    return {
      id: r.id,
      key: r.key,
      title: r.title,
      label: entry?.dataLabel ?? r.title,
      display: sensitive ? maskValue(plain) : plain,
      sensitive,
      status: r.status,
    }
  })
}

export async function getDocuments(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })
  return data ?? []
}

export async function getConsultationCredits(userId: string): Promise<ConsultationCredit[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("consultation_credits").select("*").eq("user_id", userId)
  return (data as ConsultationCredit[]) ?? []
}

// Static catalog of verified partners shown in /partners. Swap for a DB-backed
// table when real partners are onboarded.
export interface Partner {
  id: string
  name: string
  kind: "lawyer" | "accountant"
  specialty: string
  city: string
}

export const PARTNERS: Partner[] = [
  { id: "p-alvarez", name: "Lic. Ana Álvarez", kind: "lawyer", specialty: "Company incorporation & commercial law", city: "Guatemala City" },
  { id: "p-morales", name: "Lic. Diego Morales", kind: "lawyer", specialty: "Notarial deeds & registry filings", city: "Quetzaltenango" },
  { id: "p-castillo", name: "CPA Sofía Castillo", kind: "accountant", specialty: "SAT enrollment & tax regime setup", city: "Guatemala City" },
  { id: "p-recinos", name: "CPA Luis Recinos", kind: "accountant", specialty: "Bookkeeping & monthly declarations", city: "Antigua" },
]
