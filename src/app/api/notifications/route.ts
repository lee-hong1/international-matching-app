import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

const VALID_TYPES = new Set(['match', 'message', 'like', 'profile_view', 'system'])

/**
 * GET /api/notifications — 본인 알림 목록 (cursor pagination)
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`notifications-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 50)
  const unreadOnly = searchParams.get('unread') === 'true'

  let query = supabaseService
    .from('notifications')
    .select('id, type, title, body, data, is_read, created_at', { count: 'exact' })
    .eq('user_id', user.id) // 서비스 롤이므로 명시적 user_id 필터
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (unreadOnly) query = query.eq('is_read', false)

  if (cursor) {
    if (cursor.length > 512) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }
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

  const { data, error, count } = await query

  if (error) {
    console.error('[notifications GET]', error.code)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  const hasMore = (data?.length ?? 0) > limit
  const rows = hasMore ? data!.slice(0, limit) : data ?? []
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ created_at: rows.at(-1)!.created_at, id: rows.at(-1)!.id })).toString('base64')
    : null

  return NextResponse.json({ data: rows, has_more: hasMore, next_cursor: nextCursor, total: count ?? 0 })
}

/**
 * POST /api/notifications — 알림 생성 (내부 서버 간 호출용)
 * x-service-key 필수 — 클라이언트 직접 호출 차단
 */
export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const provided = req.headers.get('x-service-key')
  if (!serviceKey || provided !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { user_id?: string; type?: string; title?: string; body?: string; data?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, type, title, body: notifBody, data } = body

  if (!user_id || !isValidUuid(user_id)) {
    return NextResponse.json({ error: 'Valid user_id required' }, { status: 400 })
  }
  if (!type || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: `type must be one of: ${[...VALID_TYPES].join(', ')}` }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || title.length > 200) {
    return NextResponse.json({ error: 'title required (max 200 chars)' }, { status: 400 })
  }
  if (!notifBody || typeof notifBody !== 'string' || notifBody.length > 500) {
    return NextResponse.json({ error: 'body required (max 500 chars)' }, { status: 400 })
  }

  const { data: notification, error } = await supabaseService
    .from('notifications')
    .insert({ user_id, type, title, body: notifBody, data: data ?? null, is_read: false })
    .select('id, type, title, body, is_read, created_at')
    .single()

  if (error) {
    console.error('[notifications POST]', error.code)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }

  return NextResponse.json({ data: notification }, { status: 201 })
}

/**
 * PATCH /api/notifications — 읽음 처리
 * ?id=xxx : 단건   (본인 알림만)
 * ?all=true : 전체 읽음
 */
export async function PATCH(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`notifications-patch:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const all = searchParams.get('all') === 'true'

  if (!id && !all) {
    return NextResponse.json({ error: 'id or all=true required' }, { status: 400 })
  }
  if (id && !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid notification id' }, { status: 400 })
  }

  let query = supabaseService
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id) // IDOR 방지: 서비스 롤이어도 user_id 필터 명시
    .eq('is_read', false)

  if (id) query = query.eq('id', id)

  const { error } = await query

  if (error) {
    console.error('[notifications PATCH]', error.code)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/notifications?id=xxx — 단건 삭제 (본인만)
 */
export async function DELETE(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`notifications-delete:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Valid notification id required' }, { status: 400 })
  }

  const { error } = await supabaseService
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // IDOR 방지

  if (error) {
    console.error('[notifications DELETE]', error.code)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
