"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Lock, MapPin } from "lucide-react"
import Link from "next/link"
import { scheduleConsultation } from "@/lib/actions/consultations"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import type { Partner } from "@/lib/data"

type Kind = "lawyer" | "accountant"

interface Props {
  partners: Partner[]
  creditsByKind: Record<Kind, number>
  canSchedule: boolean
}

export function PartnersGrid({ partners, creditsByKind, canSchedule }: Props) {
  const t = useT()
  const [credits, setCredits] = useState(creditsByKind)
  const [scheduled, setScheduled] = useState<Record<string, boolean>>({})
  const [errorId, setErrorId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function onSchedule(partner: Partner) {
    setErrorId(null)
    setPendingId(partner.id)
    startTransition(async () => {
      const res = await scheduleConsultation(partner.kind)
      setPendingId(null)
      if (!res.ok || typeof res.remaining !== "number") {
        setErrorId(partner.id)
        return
      }
      setCredits((prev) => ({ ...prev, [partner.kind]: res.remaining as number }))
      setScheduled((prev) => ({ ...prev, [partner.id]: true }))
    })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {partners.map((partner) => {
        const roleLabel = partner.kind === "lawyer" ? t.partners.lawyer : t.partners.accountant
        const remaining = credits[partner.kind]
        const noCredits = remaining <= 0
        return (
          <div
            key={partner.id}
            className="flex flex-col gap-4 rounded-[8px] border border-border bg-card p-5 transition-shadow hover:shadow-card-hover"
          >
            <div className="flex flex-col gap-1">
              <span className="label-caps">{roleLabel}</span>
              <h3 className="text-lg font-semibold text-foreground">{partner.name}</h3>
              <p className="text-sm text-muted-foreground">{partner.specialty}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {partner.city}
              </p>
            </div>

            {canSchedule ? (
              <div className="mt-auto flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  {noCredits
                    ? t.partners.noCredits
                    : `${remaining} ${t.partners.kindWord[partner.kind]} ${t.partners.creditsLeft}`}
                </p>
                {scheduled[partner.id] ? (
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-success-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t.partners.scheduled}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => onSchedule(partner)}
                    disabled={noCredits || pendingId === partner.id}
                  >
                    {pendingId === partner.id ? t.common.loading : t.partners.scheduleCta}
                  </Button>
                )}
                {errorId === partner.id && (
                  <p className="text-sm text-destructive" role="alert">
                    {t.partners.noCredits}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-auto flex flex-col gap-2">
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  {t.partners.upgradeNote}
                </p>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    {t.partners.upgradeCta}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
