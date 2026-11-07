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
    .split(',').map((e) => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const start30dAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 프로필에서 국가별 집계 (풀스캔 → DB 집계로 O(N) 방지)
    const { data: profiles, error: profileErr } = await supabaseService
      .from('profiles')
      .select('country, is_premium, last_active_at')
      .not('country', 'is', null)
      .limit(50000) // 무한 풀스캔 방지

    if (profileErr) throw profileErr

    // JS 집계: 국가별 그룹핑
    const byCountry: Record<string, {
      user_count: number
      active_users: number
      premium_users: number
    }> = {}

    for (const p of profiles ?? []) {
      const c = p.country as string
      if (!c) continue
      if (!byCountry[c]) byCountry[c] = { user_count: 0, active_users: 0, premium_users: 0 }
      byCountry[c].user_count++
      if (p.last_active_at && p.last_active_at >= start30dAgo) byCountry[c].active_users++
      if (p.is_premium) byCountry[c].premium_users++
    }

    // 매칭 수 집계 (matches 테이블 미존재 시 0으로 처리)
    const matchesByCountry: Record<string, number> = {}
    try {
      // matches 테이블이 없을 수 있으므로 에러 무시
      const { data: matchData } = await supabaseService
        .from('matches')
        .select('user1_country, user2_country')
        .limit(50000)
      for (const m of matchData ?? []) {
        if (m.user1_country) matchesByCountry[m.user1_country] = (matchesByCountry[m.user1_country] ?? 0) + 1
        if (m.user2_country) matchesByCountry[m.user2_country] = (matchesByCountry[m.user2_country] ?? 0) + 1
      }
    } catch {
      // matches 테이블 없으면 0으로 유지
    }

    const result = Object.entries(byCountry)
      .map(([country, stats]) => ({
        country,
        user_count: stats.user_count,
        active_users: stats.active_users,
        matches_count: matchesByCountry[country] ?? 0,
        premium_users: stats.premium_users,
        // 참여도 점수: 활성/전체 * 100 (간이 계산)
        average_engagement: stats.user_count > 0
          ? parseFloat(((stats.active_users / stats.user_count) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.user_count - a.user_count)
      .slice(0, 50) // 상위 50개 국가만 반환

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('[analytics/countries] error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to fetch country statistics' }, { status: 500 })
  }
}
