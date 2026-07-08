import { AppHeaderClient } from "@/components/app-header-client"
import { getCurrentUser, getUserCountry } from "@/lib/data"

// Server wrapper: resolves the user's selected country, then renders the
// interactive header. Kept as `AppHeader` so page imports are unchanged.
export async function AppHeader() {
  const user = await getCurrentUser()
  const country = user ? await getUserCountry(user.id) : null
  return <AppHeaderClient country={country} />
}
