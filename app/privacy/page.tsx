import Link from "next/link"
import { Lock, Shield } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"

export default async function PrivacyPage() {
  const t = await getT()

  return (
    <div className="min-h-[100svh] bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-6 py-8 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="label-caps">{t.privacy.eyebrow}</span>
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t.privacy.title}</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground text-pretty sm:text-base">{t.privacy.intro}</p>

        {/* Encryption highlight */}
        <div className="mt-6 flex items-start gap-3 rounded-[8px] border border-primary/30 bg-accent p-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-foreground">{t.privacy.encryptionTitle}</h2>
            <p className="text-sm text-muted-foreground text-pretty">{t.privacy.encryptionBody}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {t.privacy.sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">{t.privacy.updated}</p>

        <div className="mt-6">
          <Link href="/support">
            <Button variant="outline">{t.privacy.backCta}</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
