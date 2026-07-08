import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { FinalizeForm } from "@/components/finalize/finalize-form"
import { getCurrentUser, getDocuments } from "@/lib/data"
import { getT } from "@/lib/i18n/server"

export default async function FinalizePage() {
  const t = await getT()

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const docs = await getDocuments(user.id)
  const paths = docs.map((d) => String((d as { storage_path?: string }).storage_path ?? ""))
  const initialUploaded = {
    deed: paths.some((p) => p.includes("deed__")),
    affidavit: paths.some((p) => p.includes("affidavit__")),
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-10 lg:py-14">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{t.finalize.title}</h1>
          <p className="text-muted-foreground text-pretty">{t.finalize.subtitle}</p>
        </div>

        <div className="mt-8">
          <FinalizeForm initialUploaded={initialUploaded} />
        </div>
      </main>
    </div>
  )
}
