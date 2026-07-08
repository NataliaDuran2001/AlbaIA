"use client"

import { LoadingPass } from "@/components/funnel/loading-pass"
import { buildRoadmapStep } from "@/lib/actions/funnel"
import { useT } from "@/lib/i18n/use-t"

export default function AnalyzingRoadmapPage() {
  const t = useT()
  return (
    <LoadingPass
      title={t.analyzing.pass2Title}
      subtitle={t.analyzing.pass2Subtitle}
      action={buildRoadmapStep}
      nextHref="/roadmap"
      fallbackHref="/profile"
    />
  )
}
