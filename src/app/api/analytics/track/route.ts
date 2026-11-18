import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

const VALID_ACTIVITY_TYPES = new Set([
  'profile_view', 'chat_open', 'booking_view', 'event_view',
  'post_view', 'shop_link_click', 'follow', 'search',
])

// 사용자 활동 추적 API — userId는 JWT에서 추출 (IDOR 방지)
export async function POST(req: NextRequest) {
  // Rate limit — 분석 이벤트 스팸 방지
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`analytics-track:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // 인증 필수 — body의 userId는 무시 (IDOR 취약점 방지)
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { activityType, targetUserId, metadata } = await req.json()

    if (!activityType || !VALID_ACTIVITY_TYPES.has(activityType)) {
      return NextResponse.json(
        { error: `activityType must be one of: ${[...VALID_ACTIVITY_TYPES].join(', ')}` },
        { status: 400 }
      )
    }
    if (targetUserId && !isValidUuid(targetUserId)) {
      return NextResponse.json({ error: 'targetUserId must be a valid UUID' }, { status: 400 })
    }
    // metadata 크기 제한 (임의 대용량 JSON 삽입 방지)
    if (metadata !== undefined && JSON.stringify(metadata).length > 2000) {
      return NextResponse.json({ error: 'metadata too large (max 2000 chars)' }, { status: 400 })
    }

    await supabaseService.from('user_activities').insert({
      user_id: user.id, // JWT에서만 추출
      activity_type: activityType,
      target_user_id: targetUserId ?? null,
      metadata: metadata ?? null,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    // 분석 오류는 사용자 경험에 영향 없음
    console.error('[analytics/track] error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to track activity' }, { status: 500 })
  }
}
