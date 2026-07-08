"use server"

import { createClient } from "@/lib/supabase/server"
import { analyzeBusiness } from "@/lib/ai/analyze"
import type { BusinessProfileInput, BusinessSize, Industry } from "@/lib/types"

async function ensureSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return { supabase, user }

  // Guest: create a Supabase anonymous session on first meaningful action.
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw new Error(`Could not start a session: ${error?.message ?? "unknown error"}`)
  }
  return { supabase, user: data.user }
}

// Landing → save idea against the (anonymous) session.
export async function submitIdea(idea: string) {
  const trimmed = idea.trim()
  if (!trimmed) return { ok: false, error: "Please describe your business idea." }

  const { supabase, user } = await ensureSession()

  // Keep a single business_profile row per user; upsert the idea.
  const { data: existing } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase.from("business_profiles").update({ idea_text: trimmed }).eq("id", existing.id)
  } else {
    await supabase.from("business_profiles").insert({ user_id: user.id, idea_text: trimmed })
  }

  return { ok: true }
}

// Loading pass 1 — real async "analysis" of the saved idea.
export async function analyzeIdeaStep() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No session." }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("idea_text")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!profile?.idea_text) return { ok: false, error: "No idea found. Start over." }

  await new Promise((r) => setTimeout(r, 900))
  return { ok: true }
}

// Profiling step → persist size/industry/city.
export async function submitProfile(input: BusinessProfileInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No session." }

  const { data: existing } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  const payload = { size: input.size, industry: input.industry, city: input.city.trim() }
  if (existing) {
    await supabase.from("business_profiles").update(payload).eq("id", existing.id)
  } else {
    await supabase.from("business_profiles").insert({ user_id: user.id, ...payload })
  }
  return { ok: true }
}

// Loading pass 2 — build and persist the roadmap.
export async function buildRoadmapStep() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No session." }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!profile?.idea_text || !profile.size) return { ok: false, error: "Missing profile data." }

  const roadmap = await analyzeBusiness(profile.idea_text, {
    size: profile.size as BusinessSize,
    industry: profile.industry as Industry,
    city: profile.city ?? "",
  })

  // Replace any prior roadmap for a clean rebuild.
  await supabase.from("roadmaps").delete().eq("user_id", user.id)
  await supabase.from("roadmaps").insert({
    user_id: user.id,
    recommended_structure: roadmap.recommendedStructure,
    steps: roadmap.steps,
  })

  return { ok: true, recommendedStructure: roadmap.recommendedStructure }
}
