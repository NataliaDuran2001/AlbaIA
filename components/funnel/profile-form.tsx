"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"
import { submitProfile } from "@/lib/actions/funnel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import type { BusinessSize, Industry, IngresosMensualesRango } from "@/lib/types"
import type { ExtractedProfile } from "@/lib/ai/extract"

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

function sociosToOwners(n: number): OwnersValue {
  if (n <= 1) return "1"
  if (n <= 5) return "2-5"
  if (n <= 20) return "6-20"
  return "20+"
}

// ── "AI detected" badge ───────────────────────────────────────────────────────

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
      <Sparkles className="h-2.5 w-2.5" />
      Auto-detected
    </span>
  )
}

// ── Yes/No toggle ─────────────────────────────────────────────────────────────

function YesNoToggle({
  id,
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  id: string
  value: boolean | null
  onChange: (v: boolean) => void
  yesLabel: string
  noLabel: string
}) {
  return (
    <div className="flex gap-2">
      {([true, false] as const).map((opt) => (
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
            name={id}
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

interface ProfileFormProps {
  prefilled?: ExtractedProfile
}

export function ProfileForm({ prefilled }: ProfileFormProps) {
  const t = useT()
  const router = useRouter()
  const detected = new Set(prefilled?.detected ?? [])

  // Core fields — initialized from prefilled if available
  const [industry, setIndustry] = useState<Industry | "">(prefilled?.industry ?? "")
  const [country, setCountry] = useState("")

  // Extended fields
  const [owners, setOwners] = useState<OwnersValue | null>(
    prefilled?.numero_socios != null ? sociosToOwners(prefilled.numero_socios) : null,
  )
  const [localFisico, setLocalFisico] = useState<boolean | null>(prefilled?.local_fisico ?? null)
  const [tendraEmpleados, setTendraEmpleados] = useState<boolean | null>(prefilled?.tendra_empleados ?? null)
  const [numeroEmpleados, setNumeroEmpleados] = useState<string>(
    prefilled?.numero_empleados != null ? String(prefilled.numero_empleados) : "",
  )
  const [vendeAlcohol, setVendeAlcohol] = useState<boolean | null>(prefilled?.vende_alcohol ?? null)
  const [ingresoRango, setIngresoRango] = useState<IngresosMensualesRango | "">(
    prefilled?.ingresos_mensuales_rango ?? "",
  )

  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const hasAnyDetected = detected.size > 0

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

      {/* Auto-detect banner */}
      {hasAnyDetected && (
        <div className="flex items-start gap-2 rounded-[6px] border border-primary/20 bg-primary/5 px-3 py-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="text-xs text-primary/80">
            AlbaIA pre-filled some fields based on what you described. Review and adjust anything that doesn&apos;t look right.
          </p>
        </div>
      )}

      {/* Industry */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="industry">{t.profile.industryLabel}</Label>
          {detected.has("industry") && <AiBadge />}
        </div>
        <select
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry)}
          className={cn(
            "flex h-11 w-full rounded-[4px] border bg-card px-3 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
            detected.has("industry") && industry ? "border-primary/40" : "border-input",
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
        <div className="mb-2 flex items-center gap-2">
          <legend className="text-sm font-medium text-foreground">{t.profile.ownersLabel}</legend>
          {detected.has("owners") && <AiBadge />}
        </div>
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{t.profile.localLabel}</span>
          {detected.has("local") && <AiBadge />}
        </div>
        <p className="text-xs text-muted-foreground">{t.profile.localHint}</p>
        <YesNoToggle
          id="local"
          value={localFisico}
          onChange={setLocalFisico}
          yesLabel={t.profile.yesLabel}
          noLabel={t.profile.noLabel}
        />
      </div>

      {/* Employees */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{t.profile.employeesLabel}</span>
          {detected.has("employees") && <AiBadge />}
        </div>
        <YesNoToggle
          id="employees"
          value={tendraEmpleados}
          onChange={setTendraEmpleados}
          yesLabel={t.profile.yesLabel}
          noLabel={t.profile.noLabel}
        />
        {/* Conditional: how many? */}
        {tendraEmpleados === true && (
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="empCount">{t.profile.employeeCountLabel}</Label>
              {detected.has("employeeCount") && <AiBadge />}
            </div>
            <input
              id="empCount"
              type="number"
              min={1}
              value={numeroEmpleados}
              onChange={(e) => setNumeroEmpleados(e.target.value)}
              placeholder="e.g. 3"
              className={cn(
                "flex h-11 w-full rounded-[4px] border bg-card px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
                detected.has("employeeCount") && numeroEmpleados ? "border-primary/40" : "border-input",
              )}
            />
          </div>
        )}
      </div>

      {/* Alcohol */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{t.profile.alcoholLabel}</span>
          {detected.has("alcohol") && <AiBadge />}
        </div>
        <p className="text-xs text-muted-foreground">{t.profile.alcoholHint}</p>
        <YesNoToggle
          id="alcohol"
          value={vendeAlcohol}
          onChange={setVendeAlcohol}
          yesLabel={t.profile.yesLabel}
          noLabel={t.profile.noLabel}
        />
      </div>

      {/* Expected revenue */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="revenue">{t.profile.revenueLabel}</Label>
          {detected.has("revenue") && <AiBadge />}
        </div>
        <p className="text-xs text-muted-foreground">{t.profile.revenueHint}</p>
        <select
          id="revenue"
          value={ingresoRango}
          onChange={(e) => setIngresoRango(e.target.value as IngresosMensualesRango)}
          className={cn(
            "flex h-11 w-full rounded-[4px] border bg-card px-3 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
            detected.has("revenue") && ingresoRango ? "border-primary/40" : "border-input",
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
