import "server-only"
import { createClient } from "@/lib/supabase/server"
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
    steps: (data.steps as Roadmap["steps"]) ?? [],
  }
}

export async function getChecklistItems(userId: string): Promise<ChecklistItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
  return (data as ChecklistItem[]) ?? []
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
