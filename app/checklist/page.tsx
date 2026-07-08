import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { ChecklistView } from "@/components/checklist/checklist-view"
import { createClient } from "@/lib/supabase/server"
import { seedChecklistIfEmpty } from "@/lib/checklist-seed"
import { getChecklistItems, getCurrentUser, getTier } from "@/lib/data"
import { getT } from "@/lib/i18n/server"

export default async function ChecklistPage() {
  const t = await getT()

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const supabase = await createClient()
  await seedChecklistIfEmpty(supabase, user.id)

  const [items, tier] = await Promise.all([getChecklistItems(user.id), getTier(user.id)])

  return (
    <div className="min-h-[100svh] bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-8 lg:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t.checklist.title}</h1>
          <p className="text-sm text-muted-foreground text-pretty sm:text-base">{t.checklist.subtitle}</p>
        </div>

        <div className="mt-6">
          <ChecklistView items={items} tier={tier} />
        </div>
      </main>
    </div>
  )
}
