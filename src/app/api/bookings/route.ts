import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/commerce'
import { supabaseService } from '@/lib/commerce'
import { formatBookingTime, getUserTimezone } from '@/lib/datetime'
import { detectLangFromHeader, normalizeLang } from '@/lib/i18n'

/**
 * GET /api/bookings
 * 본인 예약 목록 조회 (JWT에서 userId 추출 — IDOR 방지).
 * 응답에 booked_at(ISO UTC), timezone('UTC'), locale별 formatted_time 포함.
 */
export async function GET(req: NextRequest) {
  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── 쿼리 파라미터 ─────────────────────────────────────────────────────────
  const url = new URL(req.url)
  const status = url.searchParams.get('status') // 'pending'|'confirmed'|'cancelled'|'completed'
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const rawTimezone = url.searchParams.get('timezone') ?? 'UTC'

  // 타임존 화이트리스트 (악의적 입력 방지 — Intl 오류 catch로 처리)
  let tz = 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: rawTimezone })
    tz = rawTimezone
  } catch {
    tz = 'UTC'
  }

  const lang = detectLangFromHeader(req.headers.get('accept-language'))

  // ── DB 조회 ───────────────────────────────────────────────────────────────
  let query = supabaseService
    .from('bookings')
    .select(`
      id,
      host_id,
      guest_id,
      status,
      service_type,
      booked_at,
      duration_minutes,
      amount,
      currency,
      notes,
      created_at,
      profiles!bookings_host_id_fkey (
        id,
        display_name,
        avatar_url,
        trust_badge
      )
    `)
    .eq('guest_id', user.id)
    .order('booked_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed']
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }
    query = query.eq('status', status)
  }

  const { data: bookings, error } = await query

  if (error) {
    console.error('[bookings] fetch error:', error.code)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }

  // ── 타임존 변환 적용 ──────────────────────────────────────────────────────
  const locale = lang === 'ko' ? 'ko-KR'
    : lang === 'ja' ? 'ja-JP'
    : lang === 'zh' ? 'zh-CN'
    : 'en-US'

  const enriched = (bookings ?? []).map((b) => ({
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
      offset,
      count: enriched.length,
    },
  })
}
