import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { formatBookingTime } from '@src/lib/datetime'
import { detectLangFromHeader, t, type Lang } from '@src/lib/i18n'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// ── 이메일 fire-and-forget 헬퍼 ──────────────────────────────────────────────
async function sendBookingEmail(
  req: NextRequest,
  opts: { booking_id: string; type: 'new_booking' | 'confirmed' | 'cancelled'; recipient_id: string }
): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    // 수신자 이메일 조회
    const { data: profile } = await (await import('@src/lib/commerce')).supabaseService
      .from('profiles')
      .select('email, preferred_lang')
      .eq('id', opts.recipient_id)
      .single()
    if (!profile?.email) return
    await fetch(`${baseUrl}/api/emails/booking-notification`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-service-key': serviceKey },
      body: JSON.stringify({
        to_email: profile.email,
        type: opts.type,
        booking_id: opts.booking_id,
        lang: profile.preferred_lang ?? 'ko',
      }),
    })
  } catch {
    // 이메일 실패는 예약 성공에 영향 없음
  }
}

// ── Fire-and-forget 알림 헬퍼 ─────────────────────────────────────────────────
async function sendBookingNotification(
  req: NextRequest,
  opts: {
    recipientId: string
    type: 'new_booking' | 'confirmed' | 'cancelled' | 'completed'
    bookingId: string
    lang?: Lang
    vars?: Record<string, string>
  }
): Promise<void> {
  try {
    const lang: Lang = opts.lang ?? 'ko'
    const titleKey = `notification.${opts.type}.title`
    const bodyKey  = `notification.${opts.type}.body`
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
    await fetch(`${baseUrl}/api/send-notification`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
      body: JSON.stringify({
        user_id: opts.recipientId,
        type: opts.type,
        title: t(titleKey, lang, opts.vars),
        body:  t(bodyKey,  lang, opts.vars),
        data: { booking_id: opts.bookingId },
      }),
    })
  } catch {
    // 알림 실패는 예약 성공에 영향 없음
  }
}

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
  // cursor 기반 페이지네이션: cursor = `${created_at}__${id}` (base64 인코딩)
  const cursorParam = url.searchParams.get('cursor')
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

  // ── cursor 디코드 ─────────────────────────────────────────────────────────
  let cursorCreatedAt: string | null = null
  let cursorId: string | null = null
  if (cursorParam) {
    try {
      const decoded = Buffer.from(cursorParam, 'base64').toString('utf-8')
      const [ca, cid] = decoded.split('__')
      if (ca && cid && isValidUuid(cid)) {
        cursorCreatedAt = ca
        cursorId = cid
      }
    } catch {
      return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    }
  }

  // ── DB 조회 ───────────────────────────────────────────────────────────────
  if (status) {
    const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed']
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }
  }

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
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1) // +1로 다음 페이지 여부 판단

  if (status) query = query.eq('status', status)

  // cursor 조건: created_at < cursorCreatedAt OR (created_at = cursorCreatedAt AND id < cursorId)
  if (cursorCreatedAt && cursorId) {
    query = query.or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
    )
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

  const rows = bookings ?? []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  const enriched = page.map((b) => ({
    ...b,
    timezone: 'UTC',
    formatted_time: b.booked_at
      ? formatBookingTime(b.booked_at, tz, locale)
      : null,
  }))

  // 다음 cursor 생성
  const lastItem = page[page.length - 1]
  const nextCursor = hasMore && lastItem
    ? Buffer.from(`${lastItem.created_at}__${lastItem.id}`).toString('base64')
    : null

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

  // ── 성인 인증 필수 (청소년보호법) ────────────────────────────────────────
  const { data: requesterProfile } = await supabaseService
    .from('profiles')
    .select('is_adult')
    .eq('id', user.id)
    .single()
  if (!requesterProfile?.is_adult) {
    return NextResponse.json(
      { error: 'Age verification required / 성인 인증이 필요합니다', redirect: '/verify-age' },
      { status: 403 }
    )
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
  let body: { host_id: string; service_id?: string; booked_at: string; timezone?: string; notes?: string; duration_minutes?: number }
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

  // ── 슬롯 겹침 체크 (범위 기반) ───────────────────────────────────────────
  const duration = typeof body.duration_minutes === 'number' && body.duration_minutes > 0
    ? Math.min(body.duration_minutes, 480)
    : 60
  const { data: overlapResult, error: overlapErr } = await supabaseService
    .rpc('check_slot_overlap', {
      p_host_id: host_id,
      p_start: bookedAtIso,
      p_duration: duration,
    })
  if (overlapErr) {
    // DB 함수 없으면 단순 exact-match fallback
    const { count } = await supabaseService
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', host_id)
      .eq('booked_at', bookedAtIso)
      .neq('status', 'cancelled')
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 })
    }
  } else if (overlapResult === true) {
    return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 })
  }

  // ── 가용 시간 체크 (host_availability 등록 시에만 강제) ─────────────────────
  const { count: availCount } = await supabaseService
    .from('host_availability')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', host_id)
    .eq('is_active', true)

  if ((availCount ?? 0) > 0) {
    const { data: inSlot, error: availErr } = await supabaseService
      .rpc('check_availability_slot', {
        p_host_id: host_id,
        p_booked_at: bookedAtIso,
        p_timezone: validatedTz,
      })
    if (!availErr && inSlot === false) {
      return NextResponse.json(
        { error: 'Requested time is outside the host\'s available hours' },
        { status: 400 }
      )
    }
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
    // 23505: idempotency_key unique violation, 23P01: exclusion constraint (slot overlap)
    if (error.code === '23505' || error.code === '23P01') {
      return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 })
    }
    console.error('[bookings/POST] insert error:', error.code)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // Fire-and-forget: FCM push + 이메일 (병렬, 실패해도 예약 성공 반환)
  void sendBookingNotification(req, {
    recipientId: booking.host_id,
    type: 'new_booking',
    bookingId: booking.id,
  })
  void sendBookingEmail(req, { booking_id: booking.id, type: 'new_booking', recipient_id: booking.host_id })

  return NextResponse.json({ data: booking }, { status: 201 })
}
