import { EmptyState } from "@/components/empty-state"
import { getT } from "@/lib/i18n/server"

export default async function StatusPage() {
  const t = await getT()
  return <EmptyState title={t.emptyStates.statusTitle} body={t.emptyStates.statusBody} />
}
