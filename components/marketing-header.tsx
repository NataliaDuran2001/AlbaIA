import Link from "next/link"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-6 lg:px-16">
        <Brand />
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
