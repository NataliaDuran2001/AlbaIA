import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getChecklistItems, getCurrentUser, getRoadmap } from "@/lib/data"
import { getT } from "@/lib/i18n/server"

export default async function CompletePage() {
  const t = await getT()

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const [roadmap, items] = await Promise.all([getRoadmap(user.id), getChecklistItems(user.id)])
  const completed = items.filter((i) => i.status !== "pending").length
  const total = items.length

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <PartyPopper className="h-8 w-8 text-primary" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold text-balance">{t.complete.title}</h1>
            <p className="text-muted-foreground text-pretty">{t.complete.subtitle}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[8px] border border-border bg-card p-6">
          {roadmap?.recommendedStructure && (
            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <span className="label-caps">{t.complete.registeredAs}</span>
              <p className="font-medium text-foreground">{roadmap.recommendedStructure}</p>
            </div>
          )}
          {total > 0 && (
            <div className="flex items-baseline justify-between pt-4">
              <span className="text-sm text-muted-foreground">{t.complete.summary}</span>
              <span className="font-medium text-foreground">
                {completed} / {total} {t.complete.stepsCompleted}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/dashboard" className="w-full">
            <Button size="lg" className="w-full">
              {t.complete.goDashboard}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
