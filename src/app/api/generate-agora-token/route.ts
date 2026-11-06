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
 *   AGORA_APP_ID        — Agora 프로젝트 App ID
 *   AGORA_APP_CERTIFICATE — Agora 프로젝트 App Certificate (비밀)
 *
 * 토큰 TTL: 24시간. 클라이언트는 만료 1시간 전 재발급해야 함.
 */

const TOKEN_EXPIRY_SEC = 86400 // 24시간

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

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
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

  // 사용자가 해당 채팅방의 참여자인지 검증 (IDOR 방지)
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

    if (!isParticipant && room.match_id) {
      const { data: match } = await supabaseService
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', room.match_id)
        .single()
      const isMatchParticipant = match?.user1_id === user.id || match?.user2_id === user.id
      if (!isMatchParticipant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }


  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SEC

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

  return NextResponse.json({ token, expiresAt, appId })
}
