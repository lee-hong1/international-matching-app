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
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setUTCHours(0, 0, 0, 0)
    const startOfWeek = new Date(now)
    startOfWeek.setUTCDate(now.getUTCDate() - 7)
    const startOfMonth = new Date(now)
    startOfMonth.setUTCDate(now.getUTCDate() - 30)
    const start7dAgo = startOfWeek.toISOString()
    const start30dAgo = startOfMonth.toISOString()
    const todayIso = startOfToday.toISOString()

    const [
      { count: totalUsers },
      { count: activeToday },
      { count: activeWeek },
      { count: activeMonth },
      { count: totalMatches },
      { count: matchesToday },
      { count: totalMessages },
      { count: messagesToday },
      { count: premiumUsers },
      revenueMonthResult,
      revenueTotalResult,
    ] = await Promise.all([
      supabaseService.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseService.from('user_activities').select('user_id', { count: 'exact', head: true }).gte('created_at', todayIso),
      supabaseService.from('user_activities').select('user_id', { count: 'exact', head: true }).gte('created_at', start7dAgo),
      supabaseService.from('user_activities').select('user_id', { count: 'exact', head: true }).gte('created_at', start30dAgo),
      supabaseService.from('matches').select('id', { count: 'exact', head: true }),
      supabaseService.from('matches').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
      supabaseService.from('messages').select('id', { count: 'exact', head: true }),
      supabaseService.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
      supabaseService.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
      supabaseService.from('payments').select('amount').eq('payment_status', 'completed').gte('created_at', start30dAgo).limit(50000),
      supabaseService.from('payments').select('amount').eq('payment_status', 'completed').limit(50000),
    ])

    const revenueMonth = (revenueMonthResult.data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)
    const revenueTotal = (revenueTotalResult.data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)

    // 전환율: 프리미엄 / 전체 (division-by-zero guard)
    const totalU = totalUsers ?? 0
    const premiumU = premiumUsers ?? 0
    const conversionRate = totalU > 0 ? (premiumU / totalU) * 100 : 0

    // 7일 유지율: 7일 전~30일 전 가입자 중 7일 내 활동한 비율 (근사치)
    const { count: cohortSize } = await supabaseService
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start30dAgo)
      .lt('created_at', start7dAgo)

    const { count: cohortActive } = await supabaseService
      .from('user_activities')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', start7dAgo)

    const retentionRate7d = (cohortSize ?? 0) > 0
      ? Math.min(((cohortActive ?? 0) / (cohortSize ?? 1)) * 100, 100)
      : 0

    return NextResponse.json({
      total_users: totalU,
      active_users_today: activeToday ?? 0,
      active_users_week: activeWeek ?? 0,
      active_users_month: activeMonth ?? 0,
      total_matches: totalMatches ?? 0,
      matches_today: matchesToday ?? 0,
      total_messages: totalMessages ?? 0,
      messages_today: messagesToday ?? 0,
      premium_users: premiumU,
      revenue_total: revenueTotal,
      revenue_month: revenueMonth,
      conversion_rate: parseFloat(conversionRate.toFixed(1)),
      retention_rate_7d: parseFloat(retentionRate7d.toFixed(1)),
      retention_rate_30d: 0,
    })
  } catch (error: unknown) {
    console.error('[analytics/platform] error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to fetch platform statistics' }, { status: 500 })
  }
}
