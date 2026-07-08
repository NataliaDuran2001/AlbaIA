import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Headset, Lock, MessageCircle, Scale, Users } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getConsultationCredits, getCurrentUser, getTier } from "@/lib/data"
import { can, requiredTierFor, tierLabel } from "@/lib/gating"
import { getT } from "@/lib/i18n/server"

export default async function SupportPage() {
  const t = await getT()

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const [tier, credits] = await Promise.all([getTier(user.id), getConsultationCredits(user.id)])

  const canSpecialist = can(tier, "specialist_call")
  const canPartners = can(tier, "partner_scheduling")
  const specialistTier = tierLabel(requiredTierFor("specialist_call"))
  const partnerTier = tierLabel(requiredTierFor("partner_scheduling"))
  const totalCredits = credits.reduce((sum, c) => sum + c.remaining, 0)

  return (
    <div className="min-h-[100svh] bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-8 lg:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t.support.title}</h1>
          <p className="text-sm text-muted-foreground text-pretty sm:text-base">{t.support.subtitle}</p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {/* AlbaIA specialist support */}
          <section className="flex flex-col gap-4 rounded-[8px] border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                <Headset className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{t.support.specialistTitle}</h2>
                  {!canSpecialist && (
                    <Badge variant="premium">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {specialistTier}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-pretty">{t.support.specialistBody}</p>
              </div>
            </div>

            {canSpecialist ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-success-foreground">{t.support.specialistAvailable}</p>
                <a href="mailto:support@albaia.app?subject=Specialist%20support%20request">
                  <Button className="w-full sm:w-auto">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {t.support.contactCta}
                  </Button>
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground text-pretty">
                  {t.support.specialistLocked} {specialistTier}.
                </p>
                <Link href="/pricing" className="shrink-0">
                  <Button variant="outline" className="w-full sm:w-auto">
                    {t.support.upgradeCta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            )}
          </section>

          {/* Lawyers & accountants catalog */}
          <section className="flex flex-col gap-4 rounded-[8px] border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{t.support.partnersTitle}</h2>
                  {!canPartners && (
                    <Badge variant="premium">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {partnerTier}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-pretty">{t.support.partnersBody}</p>
              </div>
            </div>

            {canPartners ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="inline-flex items-center gap-1.5 text-sm text-success-foreground">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {totalCredits} {t.support.creditsAvailable}
                </p>
                <Link href="/partners" className="shrink-0">
                  <Button className="w-full sm:w-auto">
                    {t.support.viewCatalogCta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground text-pretty">
                  {t.support.partnersLocked} {partnerTier}.
                </p>
                <Link href="/pricing" className="shrink-0">
                  <Button variant="outline" className="w-full sm:w-auto">
                    {t.support.upgradeCta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            )}
          </section>

          {/* Self-serve help always available */}
          <section className="flex flex-col gap-2 rounded-[8px] border border-border bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-foreground">{t.support.handbookTitle}</h2>
              <p className="text-sm text-muted-foreground text-pretty">{t.support.handbookBody}</p>
            </div>
            <Link href="/handbook" className="shrink-0">
              <Button variant="outline" className="w-full sm:w-auto">
                {t.support.handbookCta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}
