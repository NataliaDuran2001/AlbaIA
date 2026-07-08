import { en } from "./en"
import { es } from "./es"

// Widen the `as const` English dictionary (literal types) into a structural type
// with plain `string` values, so `es` can hold different text while TypeScript
// still enforces EXACT key parity against `en`.
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T

export type Dictionary = Widen<typeof en>

export type Locale = "en" | "es"
export const LOCALES: Locale[] = ["en", "es"]
export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "locale"

const dictionaries: Record<Locale, Dictionary> = { en, es }

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "es"
}

// Server + client safe accessor.
export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
}
