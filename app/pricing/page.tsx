import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLANS } from "@/lib/billing/plans"
import { getT } from "@/lib/i18n/server"
import { cn } from "@/lib/utils"

export default async function PricingPage() {
  const t = await getT()

  return (
    <main className="mx-auto w-full max-w-[1280px] px-6 py-14 lg:px-16">
      <div className="mx-auto flex max-w-xl flex-col gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance lg:text-4xl">{t.pricing.title}</h1>
        <p className="text-muted-foreground text-pretty">{t.pricing.subtitle}</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={cn(
              "relative flex flex-col rounded-[8px] border border-border bg-card p-6 transition-shadow hover:shadow-card-hover",
            )}
          >
            <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-foreground">${plan.price}</span>
              <span className="text-sm text-muted-foreground">{t.pricing.perMonth}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.plans[plan.tier].tagline}</p>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {t.plans[plan.tier].features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link href={`/checkout?plan=${plan.tier}`} className="mt-8">
              <Button size="lg" variant={plan.popular ? "primary" : "outline"} className="w-full">
                {t.pricing.select} {plan.name}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}
