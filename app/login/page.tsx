import { Brand } from "@/components/brand"
import { LanguageSwitch } from "@/components/language-switch"
import { AuthForm } from "@/components/auth/auth-form"
import { getT } from "@/lib/i18n/server"

export default async function LoginPage() {
  const t = await getT()

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-8">
      <LanguageSwitch className="absolute right-4 top-4" />
      <Brand />
      <div className="mt-8 w-full max-w-md">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{t.auth.loginTitle}</h1>
          <p className="text-muted-foreground text-pretty">{t.auth.loginSubtitle}</p>
        </div>
        <div className="mt-8 rounded-[8px] border border-border bg-card p-6 shadow-card-hover">
          <AuthForm mode="login" />
        </div>
      </div>
    </main>
  )
}
