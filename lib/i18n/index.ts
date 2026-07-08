import { en, type Dictionary } from "./en"

export type Locale = "en"

const dictionaries: Record<Locale, Dictionary> = { en }

export const DEFAULT_LOCALE: Locale = "en"

// Server + client safe accessor. LATAM locales drop in here later.
export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? en
}

export type { Dictionary }
