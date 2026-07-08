import { redirect } from "next/navigation"
import { Lock } from "lucide-react"
import { Brand } from "@/components/brand"
import { CheckoutForm } from "@/components/checkout/checkout-form"
import { getPlan } from "@/lib/billing/plans"
import { getT } from "@/lib/i18n/server"

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const t = await getT()
  const { plan: planParam } = await searchParams
  const plan = getPlan(planParam ?? "enterprise")
  if (!plan) redirect("/pricing")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-6 lg:px-16">
          <Brand href="/pricing" />
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {t.checkout.secureCheckout}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-16 lg:py-14">
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{t.checkout.title}</h1>
          <p className="text-muted-foreground">
            {t.checkout.subtitle} {plan.name} {t.checkout.plan}.
          </p>
        </div>
        <CheckoutForm plan={plan} />
      </main>
    </div>
  )
}
