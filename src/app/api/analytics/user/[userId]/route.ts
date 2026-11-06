import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 사용자별 상세 분석 — 본인 데이터만 조회 가능 (IDOR 방지)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`analytics-user:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { userId } = await params

  if (!isValidUuid(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  // 본인 데이터만 조회 허용 (관리자 예외는 별도 admin 엔드포인트 사용)
  if (user.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 365)

    const since = new Date(Date.now() - days * 86400 * 1000).toISOString()
    const { data, error } = await supabaseService
      .from('user_activities')
      .select('activity_type, target_user_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    return NextResponse.json({ data: data ?? [], days })
  } catch (error: unknown) {
    console.error('[analytics/user] error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
