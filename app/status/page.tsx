import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/empty-state"
import { StatusTracker } from "@/components/status/status-tracker"
import { getChecklistItems, getCurrentUser } from "@/lib/data"
import { getT } from "@/lib/i18n/server"

export default async function StatusPage() {
  const t = await getT()

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const items = await getChecklistItems(user.id)

  if (items.length === 0) {
    return <EmptyState title={t.emptyStates.statusTitle} body={t.emptyStates.statusBody} />
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-8 lg:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t.status.title}</h1>
          <p className="text-sm text-muted-foreground text-pretty sm:text-base">{t.status.subtitle}</p>
        </div>
        <div className="mt-6">
          <StatusTracker items={items} />
        </div>
      </main>
    </div>
  )
}
