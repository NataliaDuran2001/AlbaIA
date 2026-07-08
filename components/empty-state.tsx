import Link from "next/link"
import { Clock } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"

export async function EmptyState({ title, body }: { title: string; body: string }) {
  const t = await getT()
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-panel">
          <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
        <span className="label-caps">{t.emptyStates.comingSoon}</span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold text-balance">{title}</h1>
          <p className="text-muted-foreground text-pretty">{body}</p>
        </div>
        <Link href="/checklist" className="mt-2">
          <Button variant="outline">{t.emptyStates.backCta}</Button>
        </Link>
      </main>
    </div>
  )
}
