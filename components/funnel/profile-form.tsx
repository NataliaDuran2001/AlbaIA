"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { submitProfile } from "@/lib/actions/funnel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import type { BusinessSize, Industry, IngresosMensualesRango } from "@/lib/types"

const INDUSTRY_ORDER: Industry[] = ["retail", "food", "services", "tech", "manufacturing", "other"]

type OwnersValue = "1" | "2-5" | "6-20" | "20+"

function ownersToNumeroSocios(v: OwnersValue): number {
  if (v === "1") return 1
  if (v === "2-5") return 2
  if (v === "6-20") return 6
  return 21
}

function ownersToSize(v: OwnersValue): BusinessSize {
  if (v === "1") return "solo"
  if (v === "2-5") return "small"
  return "growing"
}

// ── Small reusable toggle ─────────────────────────────────────────────────────

function YesNoToggle({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  yesLabel: string
  noLabel: string
}) {
  return (
    <div className="flex gap-2">
      {[true, false].map((opt) => (
        <label
          key={String(opt)}
          className={cn(
            "flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-[4px] border px-3 py-2 text-sm font-medium transition-colors",
            "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
            value === opt
              ? "border-primary bg-accent text-accent-foreground"
              : "border-border bg-card text-foreground hover:bg-panel",
          )}
        >
          <input
            type="radio"
            name={String(opt)}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="sr-only"
          />
          {opt ? yesLabel : noLabel}
        </label>
      ))}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function ProfileForm() {
  const t = useT()
  const router = useRouter()

  // Core fields
  const [industry, setIndustry] = useState<Industry | "">("")
  const [country, setCountry] = useState("")

  // Extended fields
  const [owners, setOwners] = useState<OwnersValue | null>(null)
  const [localFisico, setLocalFisico] = useState<boolean | null>(null)
  const [tendraEmpleados, setTendraEmpleados] = useState<boolean | null>(null)
  const [numeroEmpleados, setNumeroEmpleados] = useState<string>("")
  const [vendeAlcohol, setVendeAlcohol] = useState<boolean | null>(null)
  const [ingresoRango, setIngresoRango] = useState<IngresosMensualesRango | "">("")

  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const ownerOptions: { value: OwnersValue; label: string }[] = [
    { value: "1",    label: t.profile.ownersSolo   },
    { value: "2-5",  label: t.profile.ownersSmall  },
    { value: "6-20", label: t.profile.ownersMedium },
    { value: "20+",  label: t.profile.ownersLarge  },
  ]

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!industry) return setError(t.profile.errors.industry)
    if (!owners)   return setError(t.profile.errors.owners)
    if (!country)  return setError(t.profile.errors.country)

    const size = ownersToSize(owners)
    const numero_socios = ownersToNumeroSocios(owners)
    const numero_empleados = tendraEmpleados && numeroEmpleados ? parseInt(numeroEmpleados, 10) : undefined

    startTransition(async () => {
      const res = await submitProfile({
        size,
        industry,
        city: country,
        numero_socios,
        tendra_empleados: tendraEmpleados ?? undefined,
        numero_empleados,
        vende_alcohol: vendeAlcohol ?? undefined,
        local_fisico: localFisico ?? undefined,
        ingresos_mensuales_rango: (ingresoRango || undefined) as IngresosMensualesRango | undefined,
      })
      if (!res.ok) {
        setError(res.error ?? t.common.somethingWrong)
        return
      }
      router.push("/analyzing/roadmap")
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">

      {/* Industry */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="industry">{t.profile.industryLabel}</Label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry)}
          className={cn(
            "flex h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          )}
        >
          <option value="" disabled>{t.profile.industryPlaceholder}</option>
          {INDUSTRY_ORDER.map((value) => (
            <option key={value} value={value}>{t.profile.industries[value]}</option>
          ))}
        </select>
      </div>

      {/* Number of owners */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 block text-sm font-medium text-foreground">{t.profile.ownersLabel}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ownerOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-[4px] border px-3 py-2.5 text-center text-sm font-medium transition-colors",
                "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
                owners === opt.value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-panel",
              )}
            >
              <input
                type="radio"
                name="owners"
                value={opt.value}
                checked={owners === opt.value}
                onChange={() => setOwners(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Physical location */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.profile.localLabel}</span>
        <p className="text-xs text-muted-foreground">{t.profile.localHint}</p>
        <YesNoToggle
          value={localFisico}
          onChange={setLocalFisico}
          yesLabel={t.profile.yesLabel}
          noLabel={t.profile.noLabel}
        />
      </div>

      {/* Employees */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.profile.employeesLabel}</span>
        <YesNoToggle
          value={tendraEmpleados}
          onChange={setTendraEmpleados}
          yesLabel={t.profile.yesLabel}
          noLabel={t.profile.noLabel}
        />
        {/* Conditional: how many employees? */}
        {tendraEmpleados === true && (
          <div className="mt-2 flex flex-col gap-1">
            <Label htmlFor="empCount">{t.profile.employeeCountLabel}</Label>
            <input
              id="empCount"
              type="number"
              min={1}
              value={numeroEmpleados}
              onChange={(e) => setNumeroEmpleados(e.target.value)}
              placeholder="e.g. 3"
              className={cn(
                "flex h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
              )}
            />
          </div>
        )}
      </div>

      {/* Alcohol — shown for food industry or always (any business can sell alcohol) */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.profile.alcoholLabel}</span>
        <p className="text-xs text-muted-foreground">{t.profile.alcoholHint}</p>
        <YesNoToggle
          value={vendeAlcohol}
          onChange={setVendeAlcohol}
          yesLabel={t.profile.yesLabel}
          noLabel={t.profile.noLabel}
        />
      </div>

      {/* Expected revenue */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="revenue">{t.profile.revenueLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.profile.revenueHint}</p>
        <select
          id="revenue"
          value={ingresoRango}
          onChange={(e) => setIngresoRango(e.target.value as IngresosMensualesRango)}
          className={cn(
            "flex h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          )}
        >
          <option value="">Select an option…</option>
          {(["low", "medium", "high", "very_high"] as const).map((key) => (
            <option key={key} value={key}>{t.profile.revenues[key]}</option>
          ))}
        </select>
      </div>

      {/* Country */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="country">{t.profile.countryLabel}</Label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-describedby={error ? "profile-error" : undefined}
          className={cn(
            "flex h-11 w-full rounded-[4px] border border-input bg-card px-3 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
          )}
        >
          <option value="" disabled>{t.profile.countryPlaceholder}</option>
          {t.profile.countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && (
        <p id="profile-error" className="text-sm text-destructive" role="alert">{error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.common.loading : t.profile.submit}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  )
}
