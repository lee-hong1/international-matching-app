/**
 * GET /auth/callback
 *
 * Supabase OAuth 콜백 처리.
 * code → session 교환 후 is_suspended 체크 → 정지 계정은 /suspended로.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isSuspended } from '@/lib/suspended-check'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // 정지 계정 → /suspended
  const suspended = await isSuspended(data.user.id)
  if (suspended) {
    return NextResponse.redirect(`${origin}/suspended`)
  }

  // next 파라미터가 외부 URL이면 무시 (오픈 리다이렉트 방지)
  const safeNext = next.startsWith('/') ? next : '/feed'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
