"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { submitProfile } from "@/lib/actions/funnel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import type { BusinessSize, Industry } from "@/lib/types"

const INDUSTRY_ORDER: Industry[] = ["retail", "food", "services", "tech", "manufacturing", "other"]

export function ProfileForm() {
  const t = useT()
  const router = useRouter()
  const [size, setSize] = useState<BusinessSize | null>(null)
  const [industry, setIndustry] = useState<Industry | "">("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sizeOptions: { value: BusinessSize; label: string }[] = [
    { value: "solo", label: t.profile.sizeSolo },
    { value: "small", label: t.profile.sizeSmall },
    { value: "growing", label: t.profile.sizeGrowing },
  ]

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!size) return setError("Please select a business size.")
    if (!industry) return setError("Please select an industry.")
    if (!country) return setError("Please select a country.")

    startTransition(async () => {
      // Country is stored in the existing `city` field (business_profiles.city)
      // to avoid a schema change; the roadmap logic reads it as the location.
      const res = await submitProfile({ size, industry, city: country })
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.")
        return
      }
      router.push("/analyzing/roadmap")
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 block text-sm font-medium text-foreground">{t.profile.sizeLabel}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {sizeOptions.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-[4px] border px-3 py-2.5 text-center text-sm font-medium transition-colors",
                "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
                size === opt.value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-panel",
              )}
            >
              <input
                type="radio"
                name="size"
                value={opt.value}
                checked={size === opt.value}
                onChange={() => setSize(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

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
          <option value="" disabled>
            {t.profile.industryPlaceholder}
          </option>
          {INDUSTRY_ORDER.map((value) => (
            <option key={value} value={value}>
              {t.profile.industries[value]}
            </option>
          ))}
        </select>
      </div>

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
          <option value="" disabled>
            {t.profile.countryPlaceholder}
          </option>
          {t.profile.countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p id="profile-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.common.loading : t.profile.submit}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  )
}
