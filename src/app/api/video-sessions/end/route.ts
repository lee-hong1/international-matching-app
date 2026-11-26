import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

/**
 * POST /api/video-sessions/end
 * 영상 통화 세션 종료 — ended_at 기록, 사용 시간 확정
 *
 * Body: { sessionId: string }
 * Response: { sessionId, durationSeconds, billingMonth }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const rl = await checkRateLimit(`video-session-end:user:${user.id}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { sessionId } = body
  if (!sessionId || !isValidUuid(sessionId)) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  // 본인 소유 미종료 세션 조회
  const { data: session, error: fetchErr } = await supabaseService
    .from('video_sessions')
    .select('id, user_id, started_at, ended_at')
    .eq('id', sessionId)
    .single()

  if (fetchErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.ended_at) {
    // 이미 종료된 세션 — 멱등성 허용
    const durationSeconds = Math.round(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
    )
    return NextResponse.json({ sessionId, durationSeconds, alreadyClosed: true })
  }

  const endedAt = new Date()
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - new Date(session.started_at).getTime()) / 1000)
  )

  const { error: updateErr } = await supabaseService
    .from('video_sessions')
    .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .is('ended_at', null)

  if (updateErr) {
    console.error('[video-sessions/end] update error:', updateErr.code, updateErr.message)
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 })
  }

  return NextResponse.json({ sessionId, durationSeconds })
}
