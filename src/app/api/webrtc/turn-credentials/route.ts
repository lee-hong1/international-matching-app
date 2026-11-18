import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

/**
 * GET /api/webrtc/turn-credentials
 * HMAC-SHA1 TTL 기반 동적 TURN 크리덴셜 발급 (RFC 5389 Long-term Credential).
 *
 * username = `${expiry}:${userId}`  (expiry: Unix epoch, TTL 24h)
 * credential = HMAC-SHA1(TURN_SECRET, username) base64
 *
 * 클라이언트는 만료 1시간 전에 재호출한다.
 */
export async function GET(req: NextRequest) {
  // ── auth ─────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 영상통화 TURN 크리덴셜은 성인 인증 필수
  const { data: turnUserProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!turnUserProfile?.is_adult) {
    return NextResponse.json(
      { error: 'Age verification required', redirect: '/onboarding/verify-age' },
      { status: 403 }
    )
  }

  // ── rate limit: payment window(5/min) 재활용 ─────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await checkRateLimit(`webrtc-turn:${ip}`, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── TURN_SECRET 필수 ──────────────────────────────────────────────────────
  const turnSecret = process.env.TURN_SECRET
  const turnServerUrl = process.env.TURN_SERVER_URL
  if (!turnSecret || !turnServerUrl) {
    return NextResponse.json(
      { error: 'TURN server not configured' },
      { status: 503 }
    )
  }

  // ── 크리덴셜 생성 (TURN_SECRET 절대 응답에 포함 안 됨) ─────────────────
  const TTL = 3600 // 1시간 — 정지 계정이 만료된 크리덴셜로 계속 연결하는 것을 방지
  const expiry = Math.floor(Date.now() / 1000) + TTL
  const username = `${expiry}:${user.id}`
  const credential = createHmac('sha1', turnSecret)
    .update(username)
    .digest('base64')

  return NextResponse.json({
    urls: turnServerUrl,
    username,
    credential,
    ttl: TTL,
  })
}
