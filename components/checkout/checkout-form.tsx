"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, CreditCard, Lock } from "lucide-react"
import { confirmCheckout } from "@/lib/actions/billing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import type { Plan } from "@/lib/billing/plans"

type Method = "card" | "paypal"
type Errors = Partial<Record<"name" | "email" | "card" | "expiry" | "cvc", string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_RE = /^[\p{L}][\p{L}\s.'-]+$/u

// Field-level formatting helpers.
const digits = (v: string) => v.replace(/\D/g, "")
const formatCard = (v: string) =>
  digits(v).slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
const formatExpiry = (v: string) => {
  const d = digits(v).slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`
}

export function CheckoutForm({ plan }: { plan: Plan }) {
  const t = useT()
  const router = useRouter()
  const [method, setMethod] = useState<Method>("card")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [card, setCard] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [country, setCountry] = useState<string>(t.checkout.countries[0])
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function validate(): boolean {
    const next: Errors = {}
    if (!email.trim()) next.email = "Email is required."
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address."

    if (method === "card") {
      if (!name.trim()) next.name = "Name is required."
      else if (!NAME_RE.test(name.trim())) next.name = "Use letters only, as shown on the card."

      if (!card.trim()) next.card = "Card number is required."
      else if (digits(card).length !== 16) next.card = "Enter the full 16-digit card number."

      if (!expiry.trim()) next.expiry = "Required."
      else if (!/^\d{2}\/\d{2}$/.test(expiry)) next.expiry = "Use MM/YY."
      else {
        const mm = Number(expiry.slice(0, 2))
        if (mm < 1 || mm > 12) next.expiry = "Invalid month."
      }

      if (!cvc.trim()) next.cvc = "Required."
      else if (!/^\d{3,4}$/.test(cvc)) next.cvc = "3–4 digits."
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    startTransition(async () => {
      // DEMO MODE: confirmCheckout simulates the Stripe/PayPal webhook.
      // Replace with a real provider webhook before production.
      const res = await confirmCheckout(plan.tier)
      if (!res.ok) {
        setFormError(res.error ?? "Something went wrong.")
        return
      }
      router.replace(`/checkout/success?plan=${plan.tier}`)
    })
  }

  const methods: { value: Method; label: string }[] = [
    { value: "card", label: t.checkout.methodCard },
    { value: "paypal", label: t.checkout.methodPaypal },
  ]

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {/* Payment method selector */}
        <div role="radiogroup" aria-label={t.checkout.methodCard} className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={method === m.value}
              onClick={() => setMethod(m.value)}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-[4px] border px-3 text-sm font-medium transition-colors",
                method === m.value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-panel",
              )}
            >
              {m.value === "card" ? <CreditCard className="h-4 w-4" aria-hidden="true" /> : null}
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t.checkout.email}</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-err" : undefined}
          />
          {errors.email && (
            <p id="email-err" className="text-sm text-destructive" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {method === "card" ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t.checkout.cardName}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="cc-name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-err" : undefined}
              />
              {errors.name && (
                <p id="name-err" className="text-sm text-destructive" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="card">{t.checkout.cardNumber}</Label>
                <span className="text-xs text-muted-foreground">{t.checkout.acceptedCards}</span>
              </div>
              <Input
                id="card"
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                value={card}
                onChange={(e) => setCard(formatCard(e.target.value))}
                autoComplete="cc-number"
                aria-invalid={!!errors.card}
                aria-describedby={errors.card ? "card-err" : undefined}
              />
              {errors.card && (
                <p id="card-err" className="text-sm text-destructive" role="alert">
                  {errors.card}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="expiry">{t.checkout.expiry}</Label>
                <Input
                  id="expiry"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  autoComplete="cc-exp"
                  aria-invalid={!!errors.expiry}
                  aria-describedby={errors.expiry ? "expiry-err" : undefined}
                />
                {errors.expiry && (
                  <p id="expiry-err" className="text-sm text-destructive" role="alert">
                    {errors.expiry}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cvc">{t.checkout.cvc}</Label>
                <Input
                  id="cvc"
                  inputMode="numeric"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(digits(e.target.value).slice(0, 4))}
                  autoComplete="cc-csc"
                  aria-invalid={!!errors.cvc}
                  aria-describedby={errors.cvc ? "cvc-err" : undefined}
                />
                {errors.cvc && (
                  <p id="cvc-err" className="text-sm text-destructive" role="alert">
                    {errors.cvc}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="country">{t.checkout.country}</Label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={cn(
                  "flex h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm text-foreground",
                  "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
                )}
              >
                {t.checkout.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <p className="rounded-[4px] border border-border bg-panel p-4 text-sm text-muted-foreground">
            {t.checkout.paypalNote}
          </p>
        )}

        {formError && (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? t.common.loading
            : method === "paypal"
              ? t.checkout.payPaypal
              : `${t.checkout.pay} $${plan.price} ${t.checkout.activate}`}
        </Button>

        <p className="inline-flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t.checkout.securedBy}
        </p>
        <p className="text-center text-xs text-muted-foreground">{t.checkout.testMode}</p>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.checkout.backToPlans}
        </Link>
      </form>

      <aside className="h-fit rounded-[8px] border border-border bg-panel p-6">
        <h2 className="text-sm font-semibold text-foreground">{t.checkout.orderSummary}</h2>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-medium text-foreground">{plan.name}</span>
          <span className="text-foreground">
            ${plan.price}
            {t.pricing.perMonth}
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="font-semibold text-foreground">{t.checkout.dueToday}</span>
          <span className="text-lg font-semibold text-foreground">${plan.price}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t.checkout.guarantee}</p>
      </aside>
    </div>
  )
}
