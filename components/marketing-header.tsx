import Link from "next/link"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { LanguageSwitch } from "@/components/language-switch"
import { getDictionary, type Locale } from "@/lib/i18n"

export function MarketingHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-6 lg:px-16">
        <Brand />
        <nav className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t.auth.signIn}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
