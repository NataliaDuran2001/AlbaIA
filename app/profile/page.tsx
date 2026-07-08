import { Brand } from "@/components/brand"
import { LanguageSwitch } from "@/components/language-switch"
import { ProfileForm } from "@/components/funnel/profile-form"
import { getT } from "@/lib/i18n/server"

export default async function ProfilePage() {
  const t = await getT()

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-8">
      <LanguageSwitch className="absolute right-4 top-4" />
      <Brand />
      <div className="mt-8 w-full max-w-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="label-caps">{t.profile.step}</span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{t.profile.title}</h1>
          <p className="text-muted-foreground text-pretty">{t.profile.subtitle}</p>
        </div>
        <div className="mt-8 rounded-[8px] border border-border bg-card p-6 shadow-card-hover">
          <ProfileForm />
        </div>
      </div>
    </main>
  )
}
