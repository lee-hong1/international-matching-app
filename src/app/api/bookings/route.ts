import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@/lib/commerce'
import { formatBookingTime } from '@/lib/datetime'
import { detectLangFromHeader } from '@/lib/i18n'
import { checkRateLimit, rateLimitResponse } from '@/lib/ratelimit'

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

/**
 * POST /api/bookings
 * 예약 생성. JWT에서 guest_id 추출 (IDOR 방지).
 * 멱등성: Idempotency-Key 헤더 지원.
 */
export async function POST(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(ip, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── 멱등성 키 ─────────────────────────────────────────────────────────────
  const idempotencyKey = req.headers.get('idempotency-key')
  if (idempotencyKey) {
    const { data: existing } = await supabaseService
      .from('bookings')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ data: existing, idempotent: true }, { status: 200 })
    }
  }

  // ── 요청 파싱 ─────────────────────────────────────────────────────────────
  let body: { host_id: string; service_id?: string; booked_at: string; timezone?: string; notes?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { host_id, service_id, booked_at, timezone = 'UTC', notes } = body

  if (!host_id || !booked_at) {
    return NextResponse.json({ error: 'host_id and booked_at are required' }, { status: 400 })
  }
  if (!isValidUuid(host_id)) {
    return NextResponse.json({ error: 'Invalid host_id' }, { status: 400 })
  }
  if (service_id && !isValidUuid(service_id)) {
    return NextResponse.json({ error: 'Invalid service_id' }, { status: 400 })
  }

  // ── booked_at 유효성 ───────────────────────────────────────────────────────
  const bookedDate = new Date(booked_at)
  if (isNaN(bookedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid booked_at: not a valid ISO date' }, { status: 400 })
  }
  if (bookedDate <= new Date()) {
    return NextResponse.json({ error: 'booked_at must be in the future' }, { status: 400 })
  }

  // ── timezone 화이트리스트 ──────────────────────────────────────────────────
  let validatedTz = 'UTC'
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    validatedTz = timezone
  } catch {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }

  const bookedAtIso = bookedDate.toISOString()

  // ── 슬롯 충돌 체크 ────────────────────────────────────────────────────────
  const { count } = await supabaseService
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', host_id)
    .eq('booked_at', bookedAtIso)
    .neq('status', 'cancelled')

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 })
  }

  // ── 예약 생성 ─────────────────────────────────────────────────────────────
  const finalKey = idempotencyKey ?? `booking_${user.id}_${host_id}_${bookedAtIso}`
  const { data: booking, error } = await supabaseService
    .from('bookings')
    .insert({
      guest_id: user.id,
      host_id,
      service_id: service_id ?? null,
      booked_at: bookedAtIso,
      timezone: validatedTz,
      notes: notes ?? null,
      status: 'pending',
      idempotency_key: finalKey,
    })
    .select('id, status, booked_at, host_id, guest_id, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 })
    }
    console.error('[bookings/POST] insert error:', error.code)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  return NextResponse.json({ data: booking }, { status: 201 })
}
