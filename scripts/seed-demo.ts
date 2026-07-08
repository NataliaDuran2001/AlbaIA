/**
 * Seed two demo accounts for the live hackathon demo.
 *
 *   demo-free@albaia.gt / demo1234   — free tier, with roadmap + checklist
 *   demo-pro@albaia.gt  / demo1234   — Enterprise tier, with credits
 *
 * Requires SUPABASE service-role access. Run with:
 *   npx tsx scripts/seed-demo.ts
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (or the process environment).
 */
import { readFileSync } from "node:fs"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Minimal .env.local loader so the script runs without extra deps.
function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8")
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  } catch {
    // No .env.local — rely on the ambient environment.
  }
}

interface RoadmapStep {
  key: string
  label: string
  description: string
  status: "pending"
  premium: boolean
}

const STEPS: RoadmapStep[] = [
  { key: "identity_verification", label: "Verify your identity", description: "Confirm your DPI to begin.", status: "pending", premium: false },
  { key: "address_confirmation", label: "Confirm business address", description: "Verify your operating address.", status: "pending", premium: false },
  { key: "nit_registration", label: "Register your NIT", description: "Obtain your tax ID from SAT.", status: "pending", premium: true },
  { key: "sat_enrollment", label: "Enroll with SAT", description: "Register as a taxpayer.", status: "pending", premium: true },
]

async function findOrCreateUser(admin: SupabaseClient, email: string, password: string, fullName: string) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (created?.user) return created.user

  // Already exists — find it via the paginated admin list.
  if (error) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = list.users.find((u) => u.email === email)
    if (existing) return existing
    throw error
  }
  throw new Error(`Could not create or find ${email}`)
}

async function seedAccount(
  admin: SupabaseClient,
  opts: { email: string; fullName: string; tier: "free" | "enterprise" },
) {
  const user = await findOrCreateUser(admin, opts.email, "demo1234", opts.fullName)
  const userId = user.id

  await admin.from("profiles").upsert({ id: userId, email: opts.email, full_name: opts.fullName })

  await admin.from("business_profiles").delete().eq("user_id", userId)
  await admin.from("business_profiles").insert({
    user_id: userId,
    idea_text: "A small bakery in Guatemala City selling custom cakes and coffee.",
    size: "small",
    industry: "food",
    city: "Guatemala City",
  })

  await admin.from("roadmaps").delete().eq("user_id", userId)
  await admin.from("roadmaps").insert({
    user_id: userId,
    recommended_structure: "Limited Liability Company (Sociedad de Responsabilidad Limitada)",
    steps: STEPS,
  })

  await admin.from("checklist_items").delete().eq("user_id", userId)
  await admin.from("checklist_items").insert(
    STEPS.map((s, i) => ({
      user_id: userId,
      key: s.key,
      title: s.label,
      status: "pending",
      premium: s.premium,
      sort_order: i,
    })),
  )

  if (opts.tier === "enterprise") {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        tier: "enterprise",
        stripe_customer_id: `cus_demo_${userId.slice(0, 8)}`,
        status: "active",
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    await admin.from("consultation_credits").delete().eq("user_id", userId)
    await admin.from("consultation_credits").insert([
      { user_id: userId, kind: "lawyer", remaining: 2 },
      { user_id: userId, kind: "accountant", remaining: 2 },
    ])
  } else {
    await admin.from("subscriptions").delete().eq("user_id", userId)
  }

  console.log(`Seeded ${opts.email} (${opts.tier}) — uid ${userId}`)
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  await seedAccount(admin, { email: "demo-free@albaia.gt", fullName: "Demo Free", tier: "free" })
  await seedAccount(admin, { email: "demo-pro@albaia.gt", fullName: "Demo Pro", tier: "enterprise" })
  console.log("Done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
