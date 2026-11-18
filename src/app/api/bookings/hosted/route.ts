import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { formatBookingTime } from '@src/lib/datetime'
import { detectLangFromHeader } from '@src/lib/i18n'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

/**
 * GET /api/bookings/hosted
 * 호스트 본인의 예약 목록 조회. host_id는 JWT에서 추출 (IDOR 방지).
 * 개인정보 최소화: 게스트 이름·국가만 반환.
 */
export async function GET(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`bookings-hosted:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── 쿼리 파라미터 ─────────────────────────────────────────────────────────
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const rawLimit = parseInt(url.searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 100)
  const cursor = url.searchParams.get('cursor') // ISO timestamp for cursor-based pagination
  const rawTimezone = url.searchParams.get('timezone') ?? 'UTC'

  let tz = 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: rawTimezone })
    tz = rawTimezone
  } catch {
    tz = 'UTC'
  }

  const lang = detectLangFromHeader(req.headers.get('accept-language'))
  const locale = lang === 'ko' ? 'ko-KR'
    : lang === 'ja' ? 'ja-JP'
    : lang === 'zh' ? 'zh-CN'
    : 'en-US'

  // ── DB 조회 ───────────────────────────────────────────────────────────────
  // host_id는 JWT userId — 쿼리 파라미터에서 절대 받지 않음
  let query = supabaseService
    .from('bookings')
    .select(`
      id,
      guest_id,
      status,
      service_type,
      booked_at,
      duration_minutes,
      amount,
      currency,
      notes,
      created_at,
      profiles!bookings_guest_id_fkey (
        display_name,
        country
      )
    `)
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // +1 to detect next page

  if (status) {
    const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed']
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }
    query = query.eq('status', status)
  }

  if (cursor) {
    if (cursor.length > 100) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }
    const cursorDate = new Date(cursor)
    if (isNaN(cursorDate.getTime())) {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }
    query = query.lt('created_at', cursorDate.toISOString())
  }

  const { data: bookings, error } = await query

  if (error) {
    console.error('[bookings/hosted] fetch error:', error.code)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  const rows = bookings ?? []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1]?.created_at ?? null : null

  const enriched = page.map((b) => ({
    ...b,
    timezone: 'UTC',
    formatted_time: b.booked_at
      ? formatBookingTime(b.booked_at, tz, locale)
      : null,
  }))

  return NextResponse.json({
    data: enriched,
    meta: {
      timezone: tz,
      locale,
      limit,
      count: enriched.length,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  })
}
