import "server-only"
import { cookies } from "next/headers"
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, type Locale } from "./index"

// Reads the active locale from the `locale` cookie (server components).
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

// Server dictionary accessor: reads the cookie and returns the matching strings.
export async function getT() {
  return getDictionary(await getLocale())
}
