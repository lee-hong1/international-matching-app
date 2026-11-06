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
    // 풀스캔 후 JS 집계 대신 DB 집계 쿼리 사용 (성능: O(N) → O(distinct countries))
    const { data, error } = await supabaseService
      .rpc('get_country_counts')

    // RPC 미존재 시 fallback: 집계된 뷰 또는 group by 쿼리
    if (error) {
      const { data: raw, error: rawErr } = await supabaseService
        .from('profiles')
        .select('country')
        .not('country', 'is', null)
        .limit(50000) // 최대 5만 행 제한 (무한 풀스캔 방지)

      if (rawErr) throw rawErr

      const counts: Record<string, number> = {}
      for (const row of raw ?? []) {
        if (row.country) counts[row.country] = (counts[row.country] ?? 0) + 1
      }
      return NextResponse.json({ data: counts })
    }

    // RPC 결과: [{country, count}] 형태
    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      if (row.country) counts[row.country] = Number(row.count)
    }

    return NextResponse.json({ data: counts })
  } catch (error: unknown) {
    console.error('[analytics/countries] error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to fetch country statistics' }, { status: 500 })
  }
}
