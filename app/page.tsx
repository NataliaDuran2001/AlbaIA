import Image from "next/image"
import { CheckCircle2, FileText, Users } from "lucide-react"
import { MarketingHeader } from "@/components/marketing-header"
import { IdeaForm } from "@/components/funnel/idea-form"
import { getDictionary } from "@/lib/i18n"

export default function LandingPage() {
  const t = getDictionary()

  const trust = [
    { icon: CheckCircle2, label: t.landing.trustA },
    { icon: FileText, label: t.landing.trustB },
    { icon: Users, label: t.landing.trustC },
  ]

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-[1280px] px-6 py-12 lg:px-16 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="label-caps">{t.landing.eyebrow}</span>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-balance lg:text-5xl">
              {t.landing.title}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">{t.landing.subtitle}</p>

            <div className="mt-2 rounded-[8px] border border-border bg-card p-5 shadow-card-hover">
              <IdeaForm />
            </div>

            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-3">
              {trust.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-[8px] border border-border bg-panel">
            <Image
              src="/hero-entrepreneur.png"
              alt="A small business owner standing confidently in their shop"
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
