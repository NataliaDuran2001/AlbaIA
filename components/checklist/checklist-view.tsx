"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Check, Lock, PencilLine, Upload } from "lucide-react"
import { uploadDocument } from "@/lib/actions/documents"
import { saveChecklistData } from "@/lib/actions/checklist-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useT } from "@/lib/i18n/use-t"
import { can, requiredTierFor, tierLabel } from "@/lib/gating"
import { cn } from "@/lib/utils"
import type { ChecklistItem, ChecklistStatus, Tier } from "@/lib/types"

function statusVariant(status: ChecklistStatus) {
  if (status === "approved") return "success" as const
  if (status === "submitted") return "info" as const
  return "pending" as const
}

export function ChecklistView({ items: initialItems, tier }: { items: ChecklistItem[]; tier: Tier }) {
  const t = useT()
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [modalOpen, setModalOpen] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingUpload = useRef<string | null>(null)

  // Which "data" step is being edited, and the in-progress value + error.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)

  function startEdit(itemId: string) {
    setDataError(null)
    setDraft("")
    setEditingId(itemId)
  }

  function saveData(itemId: string) {
    const value = draft.trim()
    if (!value) {
      setDataError(t.checklist.dataRequired)
      return
    }
    setSavingId(itemId)
    setDataError(null)
    startTransition(async () => {
      const res = await saveChecklistData(itemId, value)
      setSavingId(null)
      if (!res.ok) {
        setDataError(res.error ?? t.common.somethingWrong)
        return
      }
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, status: "submitted", hasData: true } : it)),
      )
      setEditingId(null)
      setDraft("")
    })
  }

  const hasFullAccess = can(tier, "checklist_full")
  const unlockTier = tierLabel(requiredTierFor("checklist_full"))

  const statusLabel: Record<ChecklistStatus, string> = {
    pending: t.checklist.pending,
    submitted: t.checklist.submitted,
    approved: t.checklist.approved,
  }

  const total = items.length
  const done = items.filter((i) => i.status === "approved").length
  const pct = total > 0 ? (done / total) * 100 : 0

  function triggerUpload(itemId: string) {
    pendingUpload.current = itemId
    inputRef.current?.click()
  }

  function onFileSelected(file: File) {
    const itemId = pendingUpload.current
    pendingUpload.current = null
    if (!itemId) return
    setUploadingId(itemId)
    startTransition(async () => {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("checklistItemId", itemId)
      const res = await uploadDocument(fd)
      setUploadingId(null)
      if (res.ok) {
        setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "submitted" } : it)))
      }
    })
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {done} {t.common.of} {total} {t.checklist.stepsComplete}
          </span>
          <span className="text-muted-foreground">{Math.round(pct)}%</span>
        </div>
        <Progress value={pct} />
      </div>

      {/* Hidden input shared by all free-step upload buttons. */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ""
        }}
      />

      <ul className="mt-6 flex flex-col gap-2.5">
        {items.map((item) => {
          const locked = item.premium && !hasFullAccess
          const isUploading = uploadingId === item.id
          const isData = item.inputKind === "data"
          const isEditing = editingId === item.id
          const isSaving = savingId === item.id
          // A data step counts as actionable when pending; once submitted it can be edited.
          const showDataForm = isData && !locked && isEditing

          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-col gap-3 rounded-[8px] border border-border bg-card p-4 transition-shadow hover:shadow-card-hover",
                locked && "opacity-75",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    {locked && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                  </div>
                  {locked ? (
                    <p className="text-xs text-muted-foreground">
                      {t.checklist.unlocksWith} {unlockTier}
                    </p>
                  ) : (
                    isData && (
                      <p className="text-xs text-muted-foreground">
                        {item.hasData ? t.checklist.dataSaved : t.checklist.dataNeeded}
                      </p>
                    )
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {locked ? (
                    <>
                      <Badge variant="premium">{t.roadmap.premiumBadge}</Badge>
                      <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                        {isData ? (
                          <PencilLine className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Upload className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isData ? t.checklist.enter : t.checklist.upload}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant={statusVariant(item.status)}>{statusLabel[item.status]}</Badge>
                      {isData ? (
                        !isEditing && (
                          <Button variant="outline" size="sm" onClick={() => startEdit(item.id)}>
                            <PencilLine className="h-4 w-4" aria-hidden="true" />
                            {item.hasData ? t.checklist.edit : t.checklist.enter}
                          </Button>
                        )
                      ) : (
                        item.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                            onClick={() => triggerUpload(item.id)}
                          >
                            {isUploading ? (
                              t.common.loading
                            ) : (
                              <>
                                <Upload className="h-4 w-4" aria-hidden="true" />
                                {t.checklist.upload}
                              </>
                            )}
                          </Button>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>

              {showDataForm && (
                <form
                  className="flex flex-col gap-2 border-t border-border pt-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    saveData(item.id)
                  }}
                >
                  <label htmlFor={`data-${item.id}`} className="text-sm font-medium text-foreground">
                    {item.dataLabel ?? item.title}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id={`data-${item.id}`}
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={item.dataPlaceholder}
                      aria-invalid={!!dataError}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isSaving}>
                        {isSaving ? (
                          t.common.loading
                        ) : (
                          <>
                            <Check className="h-4 w-4" aria-hidden="true" />
                            {t.common.save}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null)
                          setDataError(null)
                        }}
                      >
                        {t.common.cancel}
                      </Button>
                    </div>
                  </div>
                  {dataError && (
                    <p className="text-sm text-destructive" role="alert">
                      {dataError}
                    </p>
                  )}
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    {t.checklist.encryptedNote}
                  </p>
                </form>
              )}
            </li>
          )
        })}
      </ul>

      {!hasFullAccess && (
        <div className="mt-6 flex flex-col gap-4 rounded-[8px] border border-border bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">{t.checklist.premiumCardTitle}</h2>
            <p className="max-w-xl text-sm text-muted-foreground">{t.checklist.premiumCardBody}</p>
          </div>
          <Link href="/pricing" className="shrink-0">
            <Button>
              {t.checklist.unlockCta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} closeLabel={t.checklist.close}>
        <div className="flex flex-col gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold text-foreground">{t.checklist.lockedTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.checklist.lockedBody}</p>
          </div>
          <Button size="lg" onClick={() => router.push("/pricing")}>
            {t.checklist.unlockCta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Dialog>
    </>
  )
}
