"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { submitIdea } from "@/lib/actions/funnel"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n/use-t"

export function IdeaForm() {
  const t = useT()
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await submitIdea(idea)
      if (!res.ok) {
        setError(res.error ?? t.common.somethingWrong)
        return
      }
      router.push("/analyzing")
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="idea">{t.landing.inputLabel}</Label>
        <Textarea
          id="idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={t.landing.inputPlaceholder}
          className="min-h-24 bg-card"
          aria-describedby={error ? "idea-error" : undefined}
        />
        {error && (
          <p id="idea-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? t.common.loading : t.landing.cta}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  )
}
