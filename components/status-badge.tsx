import { Badge, type BadgeProps } from "@/components/ui/badge"
import { getT } from "@/lib/i18n/server"
import type { Dictionary } from "@/lib/i18n"
import type { ChecklistStatus } from "@/lib/types"

const MAP: Record<ChecklistStatus, { variant: BadgeProps["variant"]; key: keyof Dictionary["checklist"] }> = {
  approved: { variant: "success", key: "approved" },
  submitted: { variant: "info", key: "submitted" },
  pending: { variant: "pending", key: "pending" },
}

export async function StatusBadge({ status }: { status: ChecklistStatus | string }) {
  const t = await getT()
  const cfg = MAP[(status as ChecklistStatus) in MAP ? (status as ChecklistStatus) : "pending"]
  const label = t.checklist[cfg.key] as string
  return <Badge variant={cfg.variant}>{label}</Badge>
}
