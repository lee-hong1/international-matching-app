import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

/**
 * GET /api/video-sessions/remaining
 * 이번 달 잔여 영상 통화 초(seconds) 반환
 *
 * Response: { remainingSeconds, limitSeconds, usedSeconds, billingMonth }
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const rl = await checkRateLimit(`video-remaining:user:${user.id}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // RPC로 잔여 초 조회
  const { data: remaining, error } = await supabaseService
    .rpc('get_video_remaining_seconds', { p_user_id: user.id })

  if (error) {
    console.error('[video-sessions/remaining] rpc error:', error.code, error.message)
    return NextResponse.json({ error: 'Failed to fetch remaining time' }, { status: 500 })
  }

  // 플랜 한도 조회 (UI 표시용)
  const { data: sub } = await supabaseService
    .from('user_subscriptions')
    .select('plan_id, subscription_plans(video_minutes_per_month)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const limitMinutes = (sub as any)?.subscription_plans?.video_minutes_per_month ?? 0
  const limitSeconds = limitMinutes * 60
  const remainingSeconds = remaining ?? 0
  const usedSeconds = Math.max(0, limitSeconds - remainingSeconds)
  const billingMonth = new Date().toISOString().slice(0, 7) // "2026-11"

  return NextResponse.json({ remainingSeconds, limitSeconds, usedSeconds, billingMonth })
}
