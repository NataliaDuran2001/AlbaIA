import { Brand } from "@/components/brand"
import { AuthForm } from "@/components/auth/auth-form"
import { getDictionary } from "@/lib/i18n"

export default function SignupPage() {
  const t = getDictionary()

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-8">
      <Brand />
      <div className="mt-8 w-full max-w-md">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{t.auth.signupTitle}</h1>
          <p className="text-muted-foreground text-pretty">{t.auth.signupSubtitle}</p>
        </div>
        <div className="mt-8 rounded-[8px] border border-border bg-card p-6 shadow-card-hover">
          <AuthForm mode="signup" />
        </div>
      </div>
    </main>
  )
}
