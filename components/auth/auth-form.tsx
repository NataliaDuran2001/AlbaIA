"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signInAction, signUpAction, type AuthErrorCode } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { useT } from "@/lib/i18n/use-t"

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const t = useT()
  const router = useRouter()
  const isSignup = mode === "signup"

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Clear a field's error (and any banner error) as soon as the user edits it,
  // so a corrected field stops showing red without waiting for the next submit.
  function clearFieldError(field: keyof typeof errors) {
    setError(null)
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  function validate() {
    const e = t.auth.errors
    const next: typeof errors = {}
    if (isSignup && !fullName.trim()) next.fullName = e.fullName
    if (!email.trim()) next.email = e.email
    else if (!EMAIL_RE.test(email.trim())) next.email = e.emailInvalid
    if (!password) next.password = e.password
    else if (isSignup && password.length < 8) next.password = e.passwordShort
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // Map a server error code to friendly, localized copy. Falls back to the
  // generic message for any unknown code — we never show a raw server string.
  function messageForCode(code?: AuthErrorCode): string {
    const e = t.auth.errors
    switch (code) {
      case "missing_fields":
        return e.missing_fields
      case "password_short":
        return e.password_short
      case "email_taken":
        return e.email_taken
      case "invalid_credentials":
        return e.invalid_credentials
      default:
        return e.server_error
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    startTransition(async () => {
      const res = isSignup
        ? await signUpAction({ email, password, fullName })
        : await signInAction({ email, password })
      if (!res.ok) {
        const msg = messageForCode(res.code)
        // "Email already exists" is really about the email field — anchor it there.
        if (res.code === "email_taken") setErrors((prev) => ({ ...prev, email: msg }))
        else setError(msg)
        return
      }
      router.replace("/checklist")
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {isSignup && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">{t.auth.fullName}</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              clearFieldError("fullName")
            }}
            placeholder={t.auth.fullNamePlaceholder}
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-err" : undefined}
          />
          {errors.fullName && (
            <p id="fullName-err" className="text-sm text-destructive" role="alert">
              {errors.fullName}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            clearFieldError("email")
          }}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-err" : undefined}
        />
        {errors.email && (
          <p id="email-err" className="text-sm text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t.auth.password}</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            clearFieldError("password")
          }}
          autoComplete={isSignup ? "new-password" : "current-password"}
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-err" : isSignup ? "password-hint" : undefined}
        />
        {errors.password ? (
          <p id="password-err" className="text-sm text-destructive" role="alert">
            {errors.password}
          </p>
        ) : (
          isSignup && (
            <p id="password-hint" className="text-xs text-muted-foreground">
              {t.auth.passwordHint}
            </p>
          )
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.common.loading : isSignup ? t.auth.createAccount : t.auth.signIn}
      </Button>

      {isSignup && <p className="text-center text-sm text-muted-foreground">{t.auth.savedNote}</p>}

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-primary underline underline-offset-4"
        >
          {isSignup ? t.auth.signInLink : t.auth.createYours}
        </Link>
      </p>
    </form>
  )
}
