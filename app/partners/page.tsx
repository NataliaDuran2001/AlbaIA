import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { PartnersGrid } from "@/components/partners/partners-grid"
import { Button } from "@/components/ui/button"
import { PARTNERS, getConsultationCredits, getCurrentUser, getTier } from "@/lib/data"
import { can } from "@/lib/gating"
import { getDictionary } from "@/lib/i18n"

export default async function PartnersPage() {
  const t = getDictionary()

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const [tier, credits] = await Promise.all([getTier(user.id), getConsultationCredits(user.id)])
  const canSchedule = can(tier, "partner_scheduling")

  const creditsByKind = {
    lawyer: credits.find((c) => c.kind === "lawyer")?.remaining ?? 0,
    accountant: credits.find((c) => c.kind === "accountant")?.remaining ?? 0,
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{t.partners.title}</h1>
          <p className="text-muted-foreground text-pretty">{t.partners.subtitle}</p>
        </div>

        <div className="mt-8">
          <PartnersGrid partners={PARTNERS} creditsByKind={creditsByKind} canSchedule={canSchedule} />
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/finalize" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              {t.partners.continueCta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
