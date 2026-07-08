"use client"

import Link from "next/link"
import { Check, CircleDot, Clock, FileText, PencilLine, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import type { ChecklistItem, ChecklistStatus } from "@/lib/types"

function statusVariant(status: ChecklistStatus) {
  if (status === "approved") return "success" as const
  if (status === "submitted") return "info" as const
  return "pending" as const
}

export function StatusTracker({ items }: { items: ChecklistItem[] }) {
  const t = useT()

  const total = items.length
  const approved = items.filter((i) => i.status === "approved").length
  const submitted = items.filter((i) => i.status === "submitted").length
  const pending = total - approved - submitted
  const pct = total > 0 ? (approved / total) * 100 : 0

  const statusLabel: Record<ChecklistStatus, string> = {
    pending: t.checklist.pending,
    submitted: t.checklist.submitted,
    approved: t.checklist.approved,
  }

  const summary = [
    { key: "approved", label: t.checklist.approved, value: approved },
    { key: "submitted", label: t.checklist.submitted, value: submitted },
    { key: "pending", label: t.checklist.pending, value: pending },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {approved} {t.common.of} {total} {t.status.stepsApproved}
          </span>
          <span className="text-muted-foreground">{Math.round(pct)}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.key} className="flex flex-col gap-0.5 rounded-[8px] border border-border bg-card p-4">
            <span className="text-2xl font-semibold text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <ol className="relative flex flex-col">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          const done = item.status === "approved"
          const inReview = item.status === "submitted"
          return (
            <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* connector line */}
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px",
                    done ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : inReview
                      ? "border-primary bg-accent text-primary"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : inReview ? (
                  <CircleDot className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Clock className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div className="flex flex-1 flex-col gap-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <Badge variant={statusVariant(item.status)}>{statusLabel[item.status]}</Badge>
                </div>
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  {item.inputKind === "data" ? (
                    <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {item.inputKind === "data" ? t.status.kindData : t.status.kindUpload}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Link href="/checklist">
          <Button>
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t.status.continueCta}
          </Button>
        </Link>
      </div>
    </div>
  )
}
