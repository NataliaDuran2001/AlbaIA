import { EmptyState } from "@/components/empty-state"
import { getT } from "@/lib/i18n/server"

export default async function DocumentsPage() {
  const t = await getT()
  return <EmptyState title={t.emptyStates.documentsTitle} body={t.emptyStates.documentsBody} />
}
