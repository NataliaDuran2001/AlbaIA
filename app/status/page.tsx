import { EmptyState } from "@/components/empty-state"
import { getDictionary } from "@/lib/i18n"

export default function StatusPage() {
  const t = getDictionary()
  return <EmptyState title={t.emptyStates.statusTitle} body={t.emptyStates.statusBody} />
}
