import Link from "next/link"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { getDictionary } from "@/lib/i18n"

export default function NotFound() {
  const t = getDictionary()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Brand />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold text-balance">{t.notFound.title}</h1>
        <p className="text-muted-foreground text-pretty">{t.notFound.body}</p>
      </div>
      <Link href="/">
        <Button variant="outline">{t.notFound.cta}</Button>
      </Link>
    </main>
  )
}
