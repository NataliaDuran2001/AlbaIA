import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Simplified, recognizable inline SVG flags (24×16). Inline SVG is used instead
// of emoji flags because Windows does not render regional-indicator emoji.
const FLAGS: Record<string, ReactNode> = {
  guatemala: (
    <>
      <rect width="8" height="16" x="0" fill="#4997D0" />
      <rect width="8" height="16" x="8" fill="#ffffff" />
      <rect width="8" height="16" x="16" fill="#4997D0" />
    </>
  ),
  bolivia: (
    <>
      <rect width="24" height="5.34" y="0" fill="#DA291C" />
      <rect width="24" height="5.34" y="5.33" fill="#F4E400" />
      <rect width="24" height="5.34" y="10.66" fill="#007A33" />
    </>
  ),
  peru: (
    <>
      <rect width="8" height="16" x="0" fill="#D91023" />
      <rect width="8" height="16" x="8" fill="#ffffff" />
      <rect width="8" height="16" x="16" fill="#D91023" />
    </>
  ),
  chile: (
    <>
      <rect width="24" height="8" y="0" fill="#ffffff" />
      <rect width="24" height="8" y="8" fill="#DA291C" />
      <rect width="8" height="8" x="0" y="0" fill="#0033A0" />
      <circle cx="4" cy="4" r="1.6" fill="#ffffff" />
    </>
  ),
  argentina: (
    <>
      <rect width="24" height="5.34" y="0" fill="#75AADB" />
      <rect width="24" height="5.34" y="5.33" fill="#ffffff" />
      <rect width="24" height="5.34" y="10.66" fill="#75AADB" />
      <circle cx="12" cy="8" r="2" fill="#F6B40E" />
    </>
  ),
}

// Strip accents (e.g. "Perú" -> "peru") so both locale spellings resolve to the
// same flag. Filters combining marks (U+0300–U+036F) after NFD decomposition
// without embedding those characters in source.
function normalize(name: string): string {
  return Array.from(name.trim().toLowerCase().normalize("NFD"))
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code < 0x0300 || code > 0x036f
    })
    .join("")
}

export function CountryFlag({
  country,
  showName = true,
  className,
}: {
  country: string | null | undefined
  showName?: boolean
  className?: string
}) {
  if (!country) return null
  const flag = FLAGS[normalize(country)]
  if (!flag) return null

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-block h-4 w-6 overflow-hidden rounded-[3px] ring-1 ring-border">
        <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
          {flag}
        </svg>
      </span>
      {showName && <span className="text-sm font-medium text-foreground">{country}</span>}
    </span>
  )
}
