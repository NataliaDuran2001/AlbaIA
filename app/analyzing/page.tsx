"use client"

import { LoadingPass } from "@/components/funnel/loading-pass"
import { analyzeIdeaStep } from "@/lib/actions/funnel"
import { useT } from "@/lib/i18n/use-t"

export default function AnalyzingPage() {
  const t = useT()
  return (
    <LoadingPass
      title={t.analyzing.pass1Title}
      subtitle={t.analyzing.pass1Subtitle}
      action={analyzeIdeaStep}
      nextHref="/profile"
      fallbackHref="/"
    />
  )
}
