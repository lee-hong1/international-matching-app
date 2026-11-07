import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'



const _rawRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '')
const PLATFORM_COMMISSION_RATE =
  isNaN(_rawRate) || _rawRate < 0 || _rawRate > 1 ? 0.15 : _rawRate

/**
 * POST /api/commissions
 * 내부 전용: booking completed 전환 시 커미션 자동 생성.
 * - x-service-key 헤더 = SUPABASE_SERVICE_ROLE_KEY 검증
 * - booking_id UNIQUE → 중복 호출 시 409 반환 (멱등성 보장)
 * - 개인정보는 로그에 출력 금지
 */
export async function POST(req: NextRequest) {
  // ── Rate limit (내부 전용이지만 DoS 방지) ─────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`commissions-post:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 내부 인증 (service_role 키) ────────────────────────────────────────────
  const serviceKey = req.headers.get('x-service-key')
  const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const bufA = Buffer.from(serviceKey ?? '')
  const bufB = Buffer.from(expectedKey)
  if (!serviceKey || bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── body 파싱 ──────────────────────────────────────────────────────────────
  let body: { booking_id: string; gross_amount: number; currency?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { booking_id, gross_amount, currency = 'KRW' } = body

  if (!booking_id || !isValidUuid(booking_id)) {
    return NextResponse.json({ error: 'Invalid booking_id' }, { status: 400 })
  }
  const ALLOWED_CURRENCIES = ['KRW', 'USD', 'JPY', 'CNY', 'EUR']
  if (currency !== undefined && !ALLOWED_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: `currency must be one of ${ALLOWED_CURRENCIES.join(', ')}` }, { status: 400 })
  }
  if (typeof gross_amount !== 'number' || !Number.isFinite(gross_amount) || gross_amount <= 0) {
    return NextResponse.json({ error: 'Invalid gross_amount' }, { status: 400 })
  }

  // ── 예약에서 host_id 조회 ─────────────────────────────────────────────────
  const { data: booking, error: bookingErr } = await supabaseService
    .from('bookings')
    .select('host_id, status')
    .eq('id', booking_id)
    .single()

  if (bookingErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.status !== 'completed') {
    return NextResponse.json(
      { error: 'Commission only allowed for completed bookings' },
      { status: 400 }
    )
  }

  // ── 커미션 계산 ────────────────────────────────────────────────────────────
  const commission_amount = Math.round(gross_amount * PLATFORM_COMMISSION_RATE)
  const net_amount = gross_amount - commission_amount

  // ── 삽입 (booking_id UNIQUE → 중복 시 409) ──────────────────────────────────
  const { data, error: insertErr } = await supabaseService
    .from('booking_commissions')
    .insert({
      booking_id,
      host_id: booking.host_id,
      gross_amount,
      commission_rate: PLATFORM_COMMISSION_RATE,
      commission_amount,
      net_amount,
      currency,
    })
    .select('id, net_amount, commission_amount, created_at')
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      // 중복 키 → 이미 처리된 커미션
      return NextResponse.json({ error: 'Commission already recorded' }, { status: 409 })
    }
    console.error('[commissions POST] insert error:', insertErr.code)
    return NextResponse.json({ error: 'Failed to record commission' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

/**
 * GET /api/commissions/summary → /api/commissions?summary=1
 * JWT 인증 필수. 호스트 자신의 커미션 요약 반환.
 * - 이번 달 net_amount 합계
 * - 전체 완료 예약 수
 */
export async function GET(req: NextRequest) {
  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`commissions:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 이번 달 첫째 날
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // ── 이번 달 커미션 합계 ────────────────────────────────────────────────────
  const { data: monthly, error: monthErr } = await supabaseService
    .from('booking_commissions')
    .select('net_amount')
    .eq('host_id', user.id)
    .eq('status', 'settled')
    .gte('created_at', monthStart)
    .limit(10000)

  if (monthErr) {
    console.error('[commissions GET] monthly error:', monthErr.code)
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
  }

  // ── 전체 완료 예약 수 (승인된 커미션 행 수) ────────────────────────────────
  const { count, error: countErr } = await supabaseService
    .from('booking_commissions')
    .select('*', { count: 'exact', head: true })
    .eq('host_id', user.id)
    .eq('status', 'settled')

  if (countErr) {
    console.error('[commissions GET] count error:', countErr.code)
    return NextResponse.json({ error: 'Failed to fetch commission count' }, { status: 500 })
  }

  const monthly_net = (monthly ?? []).reduce(
    (sum, row) => sum + Number(row.net_amount),
    0
  )

  return NextResponse.json({
    data: {
      monthly_net: Math.round(monthly_net),
      total_completed: count ?? 0,
      currency: 'KRW',
      month: monthStart.slice(0, 7),
    },
  })
}
