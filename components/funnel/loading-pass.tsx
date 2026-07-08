"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Brand } from "@/components/brand"
import { useT } from "@/lib/i18n/use-t"

interface LoadingPassProps {
  title: string
  subtitle: string
  // Server action returning a promise. The screen advances when it RESOLVES,
  // not on a blind timeout.
  action: () => Promise<{ ok: boolean; error?: string }>
  nextHref: string
  fallbackHref: string
}

export function LoadingPass({ title, subtitle, action, nextHref, fallbackHref }: LoadingPassProps) {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // Guard against the double-invoke of Strict Mode (dev): only fire once.
    // We intentionally do NOT cancel on cleanup — cancelling would discard the
    // in-flight result of the first run and leave the screen spinning forever.
    if (started.current) return
    started.current = true
    action()
      .then((res) => {
        if (res.ok) {
          router.replace(nextHref)
        } else {
          setError(res.error ?? t.common.somethingWrong)
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t.common.somethingWrong)
      })
  }, [action, nextHref, router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Brand />
      {error ? (
        <div className="flex max-w-md flex-col items-center gap-4">
          <p className="text-destructive" role="alert">
            {error}
          </p>
          <button
            onClick={() => router.replace(fallbackHref)}
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            {t.roadmap.startOver}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold text-balance">{title}</h1>
            <p className="text-muted-foreground text-pretty" aria-live="polite">
              {subtitle}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
