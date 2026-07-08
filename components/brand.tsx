import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold text-foreground", className)}>
      <Image src="/brand-mark.png" alt="" aria-hidden="true" width={32} height={32} className="h-8 w-8" />
      <span className="text-lg tracking-tight">Alba AI</span>
    </Link>
  )
}
