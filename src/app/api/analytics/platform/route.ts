import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 플랫폼 전체 통계 API — 관리자 전용
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`analytics-platform:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 관리자 이메일 체크
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [
      { count: totalUsers },
      { count: totalBookings },
      { count: totalHosts },
    ] = await Promise.all([
      supabaseService.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseService.from('bookings').select('id', { count: 'exact', head: true }),
      supabaseService.from('profiles').select('id', { count: 'exact', head: true }).eq('is_adult', true),
    ])

    return NextResponse.json({
      data: {
        totalUsers: totalUsers ?? 0,
        totalBookings: totalBookings ?? 0,
        totalHosts: totalHosts ?? 0,
      }
    })
  } catch (error: unknown) {
    console.error('[analytics/platform] error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to fetch platform statistics' }, { status: 500 })
  }
}
