"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Lock, Upload } from "lucide-react"
import { uploadDocument } from "@/lib/actions/documents"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
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
            {done} of {total} {t.checklist.stepsComplete}
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
          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-col gap-3 rounded-[8px] border border-border bg-card p-4 transition-shadow hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between",
                locked && "opacity-75",
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {locked && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                </div>
                {locked && (
                  <p className="text-xs text-muted-foreground">
                    {t.checklist.unlocksWith} {unlockTier}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {locked ? (
                  <>
                    <Badge variant="premium">{t.roadmap.premiumBadge}</Badge>
                    <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {t.checklist.upload}
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant={statusVariant(item.status)}>{statusLabel[item.status]}</Badge>
                    {item.status === "pending" && (
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
                    )}
                  </>
                )}
              </div>
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
