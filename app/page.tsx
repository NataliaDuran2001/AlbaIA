import Image from "next/image"
import { CheckCircle2, FileText, Users } from "lucide-react"
import { MarketingHeader } from "@/components/marketing-header"
import { IdeaForm } from "@/components/funnel/idea-form"
import { getDictionary } from "@/lib/i18n"
import { getLocale } from "@/lib/i18n/server"

export default async function LandingPage() {
  const locale = await getLocale()
  const t = getDictionary(locale)

  const trust = [
    { icon: CheckCircle2, label: t.landing.trustA },
    { icon: FileText, label: t.landing.trustB },
    { icon: Users, label: t.landing.trustC },
  ]

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <MarketingHeader locale={locale} />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 items-center px-6 py-6 lg:px-16">
        <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-3">
            <span className="label-caps">{t.landing.eyebrow}</span>
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-balance lg:text-4xl">
              {t.landing.title}
            </h1>
            <p className="max-w-xl leading-relaxed text-muted-foreground text-pretty">{t.landing.subtitle}</p>

            <div className="mt-1 rounded-[8px] border border-border bg-card p-4 shadow-card-hover">
              <IdeaForm />
            </div>

            <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
              {trust.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative hidden aspect-[4/3] max-h-[70vh] w-full overflow-hidden rounded-[8px] border border-border bg-panel lg:block">
            <Image
              src="/hero-entrepreneur.webp"
              alt={t.landing.heroAlt}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 600px"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
