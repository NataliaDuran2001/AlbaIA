import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Lock } from "lucide-react"
import { Brand } from "@/components/brand"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser, getRoadmap } from "@/lib/data"
import { getDictionary } from "@/lib/i18n"

export default async function RoadmapPage() {
  const t = getDictionary()

  const user = await getCurrentUser()
  if (!user) redirect("/")

  const roadmap = await getRoadmap(user.id)
  if (!roadmap) redirect("/profile")

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col justify-center px-6 py-6">
      <div className="flex justify-center">
        <Brand />
      </div>

      <div className="mx-auto mt-5 flex max-w-xl flex-col gap-1.5 text-center">
        <span className="label-caps">{t.roadmap.eyebrow}</span>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {roadmap.recommendedStructure}
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">{t.roadmap.supporting}</p>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{t.roadmap.previewTitle}</h2>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {roadmap.steps.length} {t.roadmap.steps}
        </span>
      </div>

      <ol className="mt-2 flex flex-col gap-2">
        {roadmap.steps.map((step, i) => (
          <li
            key={step.key}
            className="rounded-[8px] border border-border bg-card p-3.5 transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panel text-xs font-semibold text-foreground">
                {i + 1}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-foreground">{step.label}</h3>
                  {step.premium && (
                    <Badge variant="premium" className="shrink-0">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {t.roadmap.premiumBadge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-snug text-muted-foreground">{step.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col items-center gap-2.5">
        <Link href="/signup" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto">
            {t.roadmap.saveCta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t.roadmap.startOver}
        </Link>
      </div>
    </main>
  )
}
