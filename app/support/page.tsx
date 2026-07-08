import { EmptyState } from "@/components/empty-state"
import { getDictionary } from "@/lib/i18n"

export default function SupportPage() {
  const t = getDictionary()
  return <EmptyState title={t.emptyStates.supportTitle} body={t.emptyStates.supportBody} />
}
