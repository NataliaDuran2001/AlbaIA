import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { RoadmapStep } from "@/lib/types"

/**
 * Seed checklist_items from a user's roadmap steps, but only if they have none.
 * Idempotent — safe to call on every checklist visit.
 */
export async function seedChecklistIfEmpty(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase.from("checklist_items").select("id").eq("user_id", userId).limit(1)
  if (existing && existing.length > 0) return

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("steps")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const steps = (roadmap?.steps as RoadmapStep[] | undefined) ?? []
  if (steps.length === 0) return

  const rows = steps.map((s, i) => ({
    user_id: userId,
    key: s.key,
    title: s.label,
    status: "pending",
    premium: s.premium,
    sort_order: i,
  }))

  await supabase.from("checklist_items").insert(rows)
}
