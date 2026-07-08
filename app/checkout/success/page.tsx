import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Check, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPlan } from "@/lib/billing/plans"
import { getCurrentUser, getSubscription } from "@/lib/data"
import { getDictionary } from "@/lib/i18n"

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const t = getDictionary()
  const { plan: planParam } = await searchParams

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const plan = getPlan(planParam ?? "")
  if (!plan) redirect("/pricing")

  const subscription = await getSubscription(user.id)
  const nextBilling = formatDate(subscription?.current_period_end ?? null)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold text-balance">{t.success.title}</h1>
            <p className="text-muted-foreground text-pretty">{t.success.subtitle}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[8px] border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <span className="font-medium text-foreground">{plan.name}</span>
            <span className="text-foreground">
              ${plan.price}
              {t.pricing.perMonth}
            </span>
          </div>

          {nextBilling && (
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">{t.success.nextBilling}</span>
              <span className="font-medium text-foreground">{nextBilling}</span>
            </div>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{t.success.unlocked}</p>
            <ul className="flex flex-col gap-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link href="/partners" className="w-full">
            <Button size="lg" className="w-full">
              {t.success.goPartners}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link
            href="/checklist"
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t.success.backToChecklist}
          </Link>
        </div>
      </div>
    </main>
  )
}
