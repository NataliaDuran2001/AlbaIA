"use client"

import { useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/lib/i18n/locale-context"
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"

const LABEL: Record<Locale, string> = { en: "EN", es: "ES" }

export function LanguageSwitch({ className }: { className?: string }) {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const choose = useCallback(
    (next: Locale) => {
      if (next === locale) return
      // Persist for a year; the root layout reads it on the next render.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      startTransition(() => router.refresh())
    },
    [locale, router],
  )

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={cn("inline-flex items-center rounded-[4px] border border-border p-0.5", className)}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          disabled={pending}
          aria-pressed={l === locale}
          className={cn(
            "h-7 rounded-[3px] px-2 text-xs font-semibold transition-colors",
            l === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  )
}
