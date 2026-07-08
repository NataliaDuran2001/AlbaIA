"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Accessible label for the visibility toggle, e.g. "Show password" / "Hide password". */
  showLabel: string
  hideLabel: string
}

/**
 * Password field with a show/hide eye toggle. Mirrors the base Input styling but
 * reserves room on the right for the toggle button.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showLabel, hideLabel, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            "flex h-11 w-full rounded-[4px] border border-input bg-card pl-3 pr-11 text-sm text-foreground",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-[4px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-primary"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = "PasswordInput"
