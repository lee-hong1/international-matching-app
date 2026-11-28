import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

/**
 * GET /api/admin/check-role
 * JWT 기반 관리자 여부 확인.
 * ADMIN_EMAILS는 서버사이드 전용 (NEXT_PUBLIC_ 없음) — 클라이언트 번들에 노출 금지.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`admin-check-role:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ isAdmin: false })
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const userEmail = (user.email ?? '').toLowerCase()
  const isAdmin = adminEmails.length > 0 && adminEmails.includes(userEmail)

  return NextResponse.json({ isAdmin })
}
