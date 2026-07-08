import { redirect } from "next/navigation"
import { FileText, Lock, PencilLine, Upload } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { getCapturedData, getChecklistItems, getCurrentUser, getDocuments } from "@/lib/data"
import { getT } from "@/lib/i18n/server"

function fileNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path
  // Stored as `${timestamp}_${safeName}` — strip the timestamp prefix.
  return base.replace(/^\d+_/, "")
}

export default async function DocumentsPage() {
  const t = await getT()

  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const [items, captured, documents] = await Promise.all([
    getChecklistItems(user.id),
    getCapturedData(user.id),
    getDocuments(user.id),
  ])

  const uploadSteps = items.filter((i) => i.inputKind === "upload")
  const dataSteps = items.filter((i) => i.inputKind === "data")
  const hasAnything = items.length > 0

  if (!hasAnything) {
    return <EmptyState title={t.emptyStates.documentsTitle} body={t.emptyStates.documentsBody} />
  }

  const docsByItem = new Map<string | null, typeof documents>()
  for (const d of documents) {
    const key = (d.checklist_item_id as string | null) ?? null
    if (!docsByItem.has(key)) docsByItem.set(key, [])
    docsByItem.get(key)!.push(d)
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-8 lg:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t.documents.title}</h1>
          <p className="text-sm text-muted-foreground text-pretty sm:text-base">{t.documents.subtitle}</p>
        </div>

        {/* Captured data (masked) */}
        <section className="mt-8 flex flex-col gap-3">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <PencilLine className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.documents.dataSection}
          </h2>
          {dataSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.documents.dataEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dataSteps.map((step) => {
                const datum = captured.find((c) => c.id === step.id)
                return (
                  <li
                    key={step.id}
                    className="flex items-center justify-between gap-3 rounded-[8px] border border-border bg-card p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{step.dataLabel ?? step.title}</span>
                      {datum ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
                          {datum.sensitive && <Lock className="h-3 w-3" aria-hidden="true" />}
                          {datum.display}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t.documents.notProvided}</span>
                      )}
                    </div>
                    <Badge variant={datum ? "success" : "pending"}>
                      {datum ? t.documents.provided : t.documents.missing}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
          {captured.some((c) => c.sensitive) && (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t.documents.encryptedNote}
            </p>
          )}
        </section>

        {/* Uploaded documents */}
        <section className="mt-8 flex flex-col gap-3">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <Upload className="h-4 w-4 text-primary" aria-hidden="true" />
            {t.documents.uploadsSection}
          </h2>
          {uploadSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.documents.uploadsEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {uploadSteps.map((step) => {
                const stepDocs = docsByItem.get(step.id) ?? []
                return (
                  <li key={step.id} className="flex flex-col gap-2 rounded-[8px] border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{step.title}</span>
                      <Badge variant={stepDocs.length > 0 ? "success" : "pending"}>
                        {stepDocs.length > 0 ? t.documents.uploaded : t.documents.awaiting}
                      </Badge>
                    </div>
                    {stepDocs.map((d) => (
                      <span
                        key={d.id as string}
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                        {fileNameFromPath(d.storage_path as string)}
                      </span>
                    ))}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Any documents not tied to a checklist item (e.g. finalization) */}
        {(docsByItem.get(null)?.length ?? 0) > 0 && (
          <section className="mt-8 flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">{t.documents.otherSection}</h2>
            <ul className="flex flex-col gap-2">
              {docsByItem.get(null)!.map((d) => (
                <li
                  key={d.id as string}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-card p-4 text-sm text-muted-foreground"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  {fileNameFromPath(d.storage_path as string)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
