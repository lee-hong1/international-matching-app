import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

/**
 * Agora AccessToken2 생성 — 공식 agora-token SDK 사용
 * https://docs.agora.io/en/video-calling/get-started/authentication-workflow
 *
 * 필요 환경 변수 (서버 전용):
 *   AGORA_APP_ID          — Agora 프로젝트 App ID
 *   AGORA_APP_CERTIFICATE — Agora 프로젝트 App Certificate (비밀)
 *
 * 토큰 TTL: min(잔여 초, 3600). 프리미엄 구독 없거나 잔여 시간 0 → 403.
 * 토큰 발급 시 video_sessions 레코드 생성 (사용 시간 추적).
 */

const MAX_TOKEN_EXPIRY_SEC = 3600 // 최대 1시간

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`agora-token:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const userRl = await checkRateLimit(`agora-token:user:${user.id}`, 'general')
  if (!userRl.allowed) {
    const r = rateLimitResponse(userRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 영상통화는 성인 인증 필수 + 프리미엄 여부 동시 조회
  const { data: callerProfile } = await supabaseService
    .from('profiles').select('is_adult, is_premium').eq('id', user.id).single()
  if (!callerProfile?.is_adult) {
    return NextResponse.json(
      { error: 'Age verification required', redirect: '/onboarding/verify-age' },
      { status: 403 }
    )
  }

  // 프리미엄 구독 없으면 영상 통화 불가
  if (!callerProfile?.is_premium) {
    return NextResponse.json(
      { error: 'Premium subscription required', redirect: '/premium' },
      { status: 403 }
    )
  }

  const appId = process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE
  if (!appId || !appCertificate) {
    return NextResponse.json({ error: 'Video service not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { roomId } = body
  if (!roomId || typeof roomId !== 'string' || roomId.length > 128) {
    return NextResponse.json({ error: 'Invalid roomId' }, { status: 400 })
  }

  // roomId는 UUID여야 함 — 비UUID 채널명으로 참여자 검증 우회 방지 (IDOR)
  if (!isValidUuid(roomId)) {
    return NextResponse.json({ error: 'roomId must be a valid UUID' }, { status: 400 })
  }

  // 사용자가 해당 채팅방의 참여자인지 검증 + partner_id 추출 (IDOR 방지)
  let partnerId: string | null = null
  {
    const { data: room } = await supabaseService
      .from('chat_rooms')
      .select('user_id, host_id, match_id')
      .eq('id', roomId)
      .single()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const isParticipant =
      room.user_id === user.id ||
      room.host_id === user.id

    if (isParticipant) {
      // partner는 채팅방의 상대방
      partnerId = room.user_id === user.id ? room.host_id : room.user_id
    } else if (room.match_id) {
      const { data: match } = await supabaseService
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', room.match_id)
        .single()
      const isMatchParticipant = match?.user1_id === user.id || match?.user2_id === user.id
      if (!isMatchParticipant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      partnerId = match?.user1_id === user.id ? (match?.user2_id ?? null) : (match?.user1_id ?? null)
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // 원자적 quota claim + 세션 생성 (advisory lock으로 race condition 방지)
  // claim_video_session: quota check + INSERT를 단일 트랜잭션 내에서 직렬 실행
  const { data: claimRows, error: claimErr } = await supabaseService
    .rpc('claim_video_session', {
      p_user_id:   user.id,
      p_room_id:   roomId,
      p_partner_id: partnerId,
    })

  if (claimErr) {
    console.error('[agora-token] claim rpc error:', claimErr.code, claimErr.message)
    return NextResponse.json({ error: 'Failed to reserve video quota' }, { status: 500 })
  }

  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows
  const remaining: number = claim?.remaining_seconds ?? 0
  const sessionId: string | null = claim?.session_id ?? null

  if (remaining <= 0) {
    return NextResponse.json(
      { error: 'Monthly video minutes exhausted', redirect: '/premium' },
      { status: 403 }
    )
  }

  // TTL = min(잔여 초, 1시간) — 잔여 시간만큼만 Agora가 연결 허용
  const tokenExpirySec = Math.min(remaining, MAX_TOKEN_EXPIRY_SEC)
  const expiresAt = Math.floor(Date.now() / 1000) + tokenExpirySec

  // uid를 Agora 숫자 UID(0 = string uid mode)로 처리 — Agora SDK는 string uid를 account로 사용
  const token = RtcTokenBuilder.buildTokenWithUserAccount(
    appId,
    appCertificate,
    roomId,
    user.id,
    RtcRole.PUBLISHER,
    expiresAt,
    expiresAt
  )

  return NextResponse.json({ token, expiresAt, appId, sessionId, remainingSeconds: remaining })
}
