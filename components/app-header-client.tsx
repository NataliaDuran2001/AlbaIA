"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Brand } from "@/components/brand"
import { CountryFlag } from "@/components/country-flag"
import { LanguageSwitch } from "@/components/language-switch"
import { SignOutButton } from "@/components/sign-out-button"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"

export function AppHeaderClient({ country }: { country: string | null }) {
  const t = useT()
  const pathname = usePathname()

  const nav = [
    { href: "/checklist", label: t.nav.process },
    { href: "/status", label: t.nav.status },
    { href: "/documents", label: t.nav.documents },
    { href: "/partners", label: t.nav.catalog },
    { href: "/support", label: t.nav.support },
  ]

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-6 lg:px-16">
        <div className="flex items-center gap-8">
          <Brand href="/checklist" />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center rounded-[4px] px-3 text-sm font-medium transition-colors",
                    active ? "bg-panel text-primary" : "text-muted-foreground hover:bg-panel hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <CountryFlag country={country} className="hidden sm:inline-flex" />
          <LanguageSwitch />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
