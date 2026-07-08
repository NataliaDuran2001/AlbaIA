"use client"

import { getDictionary, DEFAULT_LOCALE, type Locale } from "./index"

// Thin hook so client components read strings the same way server code does.
// When LATAM locales land, this can read locale from context/cookie.
export function useT(locale: Locale = DEFAULT_LOCALE) {
  return getDictionary(locale)
}
