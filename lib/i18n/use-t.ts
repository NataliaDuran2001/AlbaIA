"use client"

import { getDictionary } from "./index"
import { useLocale } from "./locale-context"

// Client hook: reads the active locale from context (seeded by the root layout
// from the `locale` cookie) and returns the matching dictionary.
export function useT() {
  return getDictionary(useLocale())
}
