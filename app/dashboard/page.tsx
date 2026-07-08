import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  getChecklistItems,
  getConsultationCredits,
  getCurrentUser,
  getDocuments,
  getTier,
} from "@/lib/data"
import { tierLabel } from "@/lib/gating"
import { getDictionary } from "@/lib/i18n"

function prettyName(storagePath: string): string {
  const base = storagePath.split("/").pop() ?? storagePath
  return base.replace(/^\d+_/, "").replace(/^(deed__|affidavit__)/, "")
}

export default async function DashboardPage() {
  const t = getDictionary()

  const user = await getCurrentUser()
  if (!user || user.is_anonymous) redirect("/login")

  const [items, docs, tier, credits] = await Promise.all([
    getChecklistItems(user.id),
    getDocuments(user.id),
    getTier(user.id),
    getConsultationCredits(user.id),
  ])

  const fullName = (user.user_metadata as { full_name?: string } | null)?.full_name
  const total = items.length
  const approved = items.filter((i) => i.status === "approved").length
  const pct = total > 0 ? (approved / total) * 100 : 0
  const isEnterprise = tier === "enterprise"

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-16 lg:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {t.dashboard.greeting}
          {fullName ? `, ${fullName}` : ""}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Milestones */}
          <section className="rounded-[8px] border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{t.dashboard.milestones}</h2>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  {approved} of {total} {t.dashboard.milestonesComplete}
                </span>
                <span className="text-muted-foreground">{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} />
            </div>
          </section>

          {/* Subscription */}
          <section className="rounded-[8px] border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{t.dashboard.subscription}</h2>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-semibold text-foreground">{tierLabel(tier)}</span>
              {tier === "free" && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    {t.dashboard.viewPlans}
                  </Button>
                </Link>
              )}
            </div>
          </section>

          {/* Document vault */}
          <section className="rounded-[8px] border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{t.dashboard.vault}</h2>
            {docs.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t.dashboard.empty}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {docs.map((doc) => {
                  const d = doc as { id: string; storage_path: string; status: string }
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{prettyName(d.storage_path)}</span>
                      </span>
                      <div className="shrink-0">
                        <StatusBadge status={d.status} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Partners (Enterprise only) */}
          {isEnterprise && (
            <section className="rounded-[8px] border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{t.dashboard.partners}</h2>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {credits.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="capitalize text-foreground">{t.partners.kindWord[c.kind]}</span>
                    <span className="text-muted-foreground">
                      {c.remaining} {t.dashboard.creditsRemaining}
                    </span>
                  </li>
                ))}
                {credits.length === 0 && <li className="text-muted-foreground">{t.dashboard.empty}</li>}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
