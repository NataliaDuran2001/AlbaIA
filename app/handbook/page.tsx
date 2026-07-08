import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"

export default async function HandbookPage() {
  const t = await getT()

  return (
    <div className="min-h-[100svh] bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-6 py-8 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="label-caps">{t.handbook.eyebrow}</span>
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t.handbook.title}</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground text-pretty sm:text-base">{t.handbook.intro}</p>

        <div className="mt-8 flex flex-col gap-6">
          {t.handbook.sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-3 rounded-[8px] border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{section.body}</p>
              {section.points.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {section.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/checklist">
            <Button>
              {t.handbook.startCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/privacy">
            <Button variant="outline">{t.handbook.privacyCta}</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
