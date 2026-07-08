import Link from "next/link"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold text-foreground", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-lg tracking-tight">AlbaIA</span>
    </Link>
  )
}
