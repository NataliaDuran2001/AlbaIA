import { EmptyState } from "@/components/empty-state"
import { getDictionary } from "@/lib/i18n"

export default function DocumentsPage() {
  const t = getDictionary()
  return <EmptyState title={t.emptyStates.documentsTitle} body={t.emptyStates.documentsBody} />
}
