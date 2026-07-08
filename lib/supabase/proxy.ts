import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that require any session — anonymous (guest) or real.
const SESSION_REQUIRED = ["/checklist", "/pricing", "/checkout", "/partners", "/finalize", "/complete"]
// Routes that require a real (non-anonymous) authenticated account.
const REAL_USER_REQUIRED = ["/dashboard"]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAnonymous = user?.is_anonymous ?? false
  const needsSession = SESSION_REQUIRED.some((p) => pathname.startsWith(p))
  const needsRealUser = REAL_USER_REQUIRED.some((p) => pathname.startsWith(p))

  // /dashboard requires a permanent account; the funnel routes accept a guest
  // (anonymous) session too. Anything requiring at least a session redirects to
  // /login when there is none.
  const denied = needsRealUser ? !user || isAnonymous : needsSession && !user

  if (denied) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
