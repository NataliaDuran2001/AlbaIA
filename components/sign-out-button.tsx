"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { signOutAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"

export function SignOutButton() {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      await signOutAction()
      router.push("/")
      router.refresh()
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={pending}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {t.nav.signOut}
    </Button>
  )
}
