"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Upload } from "lucide-react"
import { uploadDocument } from "@/lib/actions/documents"
import { submitFinalization } from "@/lib/actions/finalize"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"

type SlotKey = "deed" | "affidavit"

// The upload filename is prefixed with the slot key so the server can tell which
// document fills which slot (the documents schema has no category column).
export const SLOT_PREFIX: Record<SlotKey, string> = { deed: "deed__", affidavit: "affidavit__" }

export function FinalizeForm({ initialUploaded }: { initialUploaded: Record<SlotKey, boolean> }) {
  const t = useT()
  const router = useRouter()
  const [uploaded, setUploaded] = useState(initialUploaded)
  const [pendingSlot, setPendingSlot] = useState<SlotKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, startSubmit] = useTransition()
  const inputs = { deed: useRef<HTMLInputElement>(null), affidavit: useRef<HTMLInputElement>(null) }

  const slots: { key: SlotKey; label: string; hint: string }[] = [
    { key: "deed", label: t.finalize.deed, hint: t.finalize.deedHint },
    { key: "affidavit", label: t.finalize.affidavit, hint: t.finalize.affidavitHint },
  ]

  async function onFile(slot: SlotKey, file: File) {
    setError(null)
    setPendingSlot(slot)
    const renamed = new File([file], `${SLOT_PREFIX[slot]}${file.name}`, { type: file.type })
    const fd = new FormData()
    fd.append("file", renamed)
    const res = await uploadDocument(fd)
    setPendingSlot(null)
    if (!res.ok) {
      setError(res.error ?? "Upload failed.")
      return
    }
    setUploaded((prev) => ({ ...prev, [slot]: true }))
  }

  function onSubmit() {
    setError(null)
    startSubmit(async () => {
      const res = await submitFinalization()
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.")
        return
      }
      router.replace("/complete")
    })
  }

  const bothUploaded = uploaded.deed && uploaded.affidavit

  return (
    <div className="flex flex-col gap-4">
      {slots.map((slot) => {
        const done = uploaded[slot.key]
        const isPending = pendingSlot === slot.key
        return (
          <div key={slot.key} className="flex items-start justify-between gap-4 rounded-[8px] border border-border bg-card p-5">
            <div className="flex flex-col gap-1">
              <h3 className="font-medium text-foreground">{slot.label}</h3>
              <p className="text-sm text-muted-foreground">{slot.hint}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {done && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t.finalize.uploaded}
                </span>
              )}
              <input
                ref={inputs[slot.key]}
                type="file"
                accept=".pdf,image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onFile(slot.key, file)
                  e.target.value = ""
                }}
              />
              <Button
                variant="outline"
                onClick={() => inputs[slot.key].current?.click()}
                disabled={isPending}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {isPending ? t.common.loading : done ? t.finalize.replaceCta : t.finalize.uploadCta}
              </Button>
            </div>
          </div>
        )
      })}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button size="lg" className="mt-2" disabled={!bothUploaded || submitting} onClick={onSubmit}>
        {submitting ? t.common.loading : t.finalize.submit}
      </Button>
    </div>
  )
}
