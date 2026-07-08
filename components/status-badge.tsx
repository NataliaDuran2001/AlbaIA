import { Badge, type BadgeProps } from "@/components/ui/badge"
import { getDictionary } from "@/lib/i18n"
import type { ChecklistStatus } from "@/lib/types"

const MAP: Record<ChecklistStatus, { variant: BadgeProps["variant"]; key: keyof ReturnType<typeof getDictionary>["checklist"] }> = {
  approved: { variant: "success", key: "approved" },
  submitted: { variant: "info", key: "submitted" },
  pending: { variant: "pending", key: "pending" },
}

export function StatusBadge({ status }: { status: ChecklistStatus | string }) {
  const t = getDictionary()
  const cfg = MAP[(status as ChecklistStatus) in MAP ? (status as ChecklistStatus) : "pending"]
  return <Badge variant={cfg.variant}>{t.checklist[cfg.key]}</Badge>
}
