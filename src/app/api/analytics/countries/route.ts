import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 국가별 통계 API — 관리자 전용
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`analytics-countries:${ip}`, 'general')
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
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const start30dAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // DB 집계: GROUP BY country (O(N) JS 집계 대신 DB 처리)
    const { data: rows, error: profileErr } = await supabaseService.rpc('analytics_countries', {
      p_since: start30dAgo,
    }) as { data: Array<{
      country: string
      user_count: number
      active_users: number
      premium_users: number
    }> | null, error: unknown }

    // RPC 미존재 시 fallback: select + JS (최대 10000행 제한)
    if (profileErr) {
      const { data: profiles, error: fallbackErr } = await supabaseService
        .from('profiles')
        .select('country, is_premium, last_active_at')
        .not('country', 'is', null)
        .limit(10000)
      if (fallbackErr) throw fallbackErr
      if ((profiles?.length ?? 0) >= 10000) {
        console.error('[analytics/countries] fallback query hit 10000-row cap — upgrade to rpc analytics_countries')
      }

      const byCountry: Record<string, { user_count: number; active_users: number; premium_users: number }> = {}
      for (const p of profiles ?? []) {
        const c = p.country as string
        if (!c) continue
        if (!byCountry[c]) byCountry[c] = { user_count: 0, active_users: 0, premium_users: 0 }
        byCountry[c].user_count++
        if (p.last_active_at && p.last_active_at >= start30dAgo) byCountry[c].active_users++
        if (p.is_premium) byCountry[c].premium_users++
      }
      const result = Object.entries(byCountry)
        .map(([country, s]) => ({
          country,
          user_count: s.user_count,
          active_users: s.active_users,
          matches_count: 0,
          premium_users: s.premium_users,
          average_engagement: s.user_count > 0 ? parseFloat(((s.active_users / s.user_count) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.user_count - a.user_count)
        .slice(0, 50)
      return NextResponse.json(result)
    }

    const result = (rows ?? [])
      .map((r) => ({
        country: r.country,
        user_count: Number(r.user_count),
        active_users: Number(r.active_users),
        matches_count: 0,
        premium_users: Number(r.premium_users),
        average_engagement: Number(r.user_count) > 0
          ? parseFloat(((Number(r.active_users) / Number(r.user_count)) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.user_count - a.user_count)
      .slice(0, 50)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('[analytics/countries] error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to fetch country statistics' }, { status: 500 })
  }
}
