import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { detectExternalPlatform } from '@src/lib/chat-safety'

const MAX_CONTENT_LENGTH = 2000

function getBaseUrl(req: Request): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) return appUrl
  const host = req.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

/**
 * POST /api/chat/messages
 * 채팅 메시지 전송. 외부 플랫폼 유도 감지 → violation_count 증가 → 3회 시 정지.
 * user_id는 항상 JWT에서 추출 (IDOR 방지).
 */
export async function POST(req: NextRequest) {
  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`chat:${ip}`, 'general')
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── body 파싱 ──────────────────────────────────────────────────────────────
  let body: { room_id: string; content: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { room_id, content } = body

  if (!room_id || !isValidUuid(room_id)) {
    return NextResponse.json({ error: 'Invalid room_id' }, { status: 400 })
  }
  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `Content exceeds ${MAX_CONTENT_LENGTH} characters` },
      { status: 400 }
    )
  }

  // ── 정지된 계정 차단 ─────────────────────────────────────────────────────
  const { data: profile, error: profileErr } = await supabaseService
    .from('profiles')
    .select('is_suspended, violation_count')
    .eq('id', user.id)
    .single()

  if (profileErr) {
    return NextResponse.json({ error: 'Failed to verify account status' }, { status: 500 })
  }
  if (profile?.is_suspended) {
    return NextResponse.json(
      { error: 'Account suspended' },
      { status: 403 }
    )
  }

  // ── 채팅방 참여자 확인 ──────────────────────────────────────────────────
  const { data: room, error: roomErr } = await supabaseService
    .from('chat_rooms')
    .select('id, user_id, host_id')
    .eq('id', room_id)
    .or(`user_id.eq.${user.id},host_id.eq.${user.id}`)
    .single()

  if (roomErr || !room) {
    return NextResponse.json({ error: 'Chat room not found or access denied' }, { status: 404 })
  }

  // ── 외부 플랫폼 유도 감지 ──────────────────────────────────────────────
  if (detectExternalPlatform(content)) {
    const currentCount = (profile?.violation_count ?? 0) + 1
    const willSuspend = currentCount >= 3

    // violation_count 증가 + 필요 시 정지 (원자적 UPDATE)
    await supabaseService
      .from('profiles')
      .update({
        violation_count: currentCount,
        ...(willSuspend ? { is_suspended: true } : {}),
      })
      .eq('id', user.id)

    if (willSuspend) {
      // FCM 정지 알림 fire-and-forget (법적 고지 의무)
      void fetch(`${getBaseUrl(req)}/api/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
        body: JSON.stringify({
          userId: user.id,
          payload: {
            title: '계정 임시 정지 / Account Suspended',
            body: '외부 플랫폼 유도로 인한 임시 정지입니다. / Account suspended for directing to external platforms.',
            data: { type: 'suspension', reason: 'external_platform' },
          },
        }),
      }).catch(() => {})
      // 이메일 고지 (한국 전자상거래법 고지 의무)
      void fetch(`${getBaseUrl(req)}/api/emails/suspension-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {})

      return NextResponse.json(
        {
          error: 'Account suspended after 3 violations',
          suspended: true,
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        error: 'External platform links are not allowed',
        warning: true,
        violation_count: currentCount,
        remaining_warnings: 3 - currentCount,
      },
      { status: 400 }
    )
  }

  // ── 정상 메시지 저장 ──────────────────────────────────────────────────
  const { data: message, error: insertErr } = await supabaseService
    .from('messages')
    .insert({
      room_id,
      sender_id: user.id,
      content: content.trim(),
    })
    .select('id, room_id, sender_id, content, created_at')
    .single()

  if (insertErr) {
    console.error('[chat POST] insert error:', insertErr.code)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({ data: message }, { status: 201 })
}

/**
 * GET /api/chat/messages?room_id=...&cursor=...
 * 채팅 메시지 조회. JWT 인증 + 채팅방 참여자 확인.
 */
export async function GET(req: NextRequest) {
  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`chat:${ip}`, 'general')
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const room_id = searchParams.get('room_id') ?? ''
  const cursor = searchParams.get('cursor')

  if (!room_id || !isValidUuid(room_id)) {
    return NextResponse.json({ error: 'Invalid room_id' }, { status: 400 })
  }

  // ── 채팅방 참여자 확인 ──────────────────────────────────────────────────
  const { data: room, error: roomErr } = await supabaseService
    .from('chat_rooms')
    .select('id')
    .eq('id', room_id)
    .or(`user_id.eq.${user.id},host_id.eq.${user.id}`)
    .single()

  if (roomErr || !room) {
    return NextResponse.json({ error: 'Chat room not found or access denied' }, { status: 404 })
  }

  // ── 커서 기반 페이지네이션 (최신순) ───────────────────────────────────
  let query = supabaseService
    .from('messages')
    .select('id, sender_id, content, is_flagged, created_at')
    .eq('room_id', room_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (cursor) {
    try {
      const { created_at, id } = JSON.parse(Buffer.from(cursor, 'base64').toString())
      // Injection 방지: cursor 값 형식 검증
      if (!isValidUuid(String(id)) || !/^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(String(created_at))) {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
      }
      query = query.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`)
    } catch {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }
  }

  const { data: messages, error: fetchErr } = await query

  if (fetchErr) {
    console.error('[chat GET] fetch error:', fetchErr.code)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  const items = messages ?? []
  const nextCursor =
    items.length === 50
      ? Buffer.from(
          JSON.stringify({ created_at: items[49].created_at, id: items[49].id })
        ).toString('base64')
      : null

  return NextResponse.json({ data: items, next_cursor: nextCursor })
}
