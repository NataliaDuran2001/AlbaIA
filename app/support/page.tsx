import { EmptyState } from "@/components/empty-state"
import { getT } from "@/lib/i18n/server"

export default async function SupportPage() {
  const t = await getT()
  return <EmptyState title={t.emptyStates.supportTitle} body={t.emptyStates.supportBody} />
}
