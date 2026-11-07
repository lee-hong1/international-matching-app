import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { t, type Lang } from '@src/lib/i18n'
import { isSuspended } from '@src/lib/suspended-check'

async function sendBookingEmail(
  _req: NextRequest,
  opts: { booking_id: string; type: 'confirmed' | 'cancelled'; recipient_id: string }
): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!baseUrl) return
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const { data: profile } = await supabaseService
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
    // 이메일 실패는 상태 변경 성공에 영향 없음
  }
}

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
type NotifiableStatus = 'confirmed' | 'cancelled' | 'completed'

async function sendStatusNotification(
  _req: NextRequest,
  opts: {
    recipientId: string
    newStatus: NotifiableStatus
    bookingId: string
    lang?: Lang
    vars?: Record<string, string>
  }
): Promise<void> {
  try {
    const lang: Lang = opts.lang ?? 'ko'
    const titleKey = `notification.${opts.newStatus}.title`
    const bodyKey  = `notification.${opts.newStatus}.body`
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!baseUrl) return
    await fetch(`${baseUrl}/api/send-notification`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-service-key': process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' },
      body: JSON.stringify({
        user_id: opts.recipientId,
        type: opts.newStatus,
        title: t(titleKey, lang, opts.vars),
        body:  t(bodyKey,  lang, opts.vars),
        data: { booking_id: opts.bookingId },
      }),
    })
  } catch {
    // 알림 실패는 상태 변경 성공에 영향 없음
  }
}

// 허용된 상태 전이 규칙
// key: 현재 상태, value: { 호스트 허용 전이, 사용자 허용 전이 }
const HOST_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}
const USER_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending:   ['cancelled'],
  confirmed: ['cancelled'],
  completed: [],
  cancelled: [],
}

/**
 * PATCH /api/bookings/:id/status
 * 예약 상태 변경.
 * - 호스트: pending→confirmed, pending/confirmed→cancelled, confirmed→completed
 * - 사용자: pending/confirmed→cancelled
 * - completed 이후 변경 불가
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`booking-status:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── UUID 검증 ──────────────────────────────────────────────────────────────
  const { id } = await params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 })
  }

  // ── body 파싱 ──────────────────────────────────────────────────────────────
  let body: { status: BookingStatus }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { status: newStatusRaw } = body
  const VALID_STATUSES: NotifiableStatus[] = ['confirmed', 'cancelled', 'completed']
  if (!VALID_STATUSES.includes(newStatusRaw as NotifiableStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const newStatus = newStatusRaw as NotifiableStatus

  // ── 예약 조회 ─────────────────────────────────────────────────────────────
  const { data: booking, error: fetchErr } = await supabaseService
    .from('bookings')
    .select('id, guest_id, host_id, status, amount, currency, booked_at, payment_intent_id, payment_status')
    .eq('id', id)
    .single()

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // ── 역할 판단 ─────────────────────────────────────────────────────────────
  const isHost = booking.host_id === user.id
  const isUser = booking.guest_id === user.id
  if (!isHost && !isUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 정지 계정 체크 ────────────────────────────────────────────────────────
  // 호스트 정지: completed/confirmed 처리 차단 (사용자 취소 권리는 유지)
  // 사용자 정지: cancelled(본인 취소)는 소비자 권리로 허용
  if (isHost && newStatus !== 'cancelled') {
    if (await isSuspended(user.id)) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }
  }

  // ── 상태 전이 검증 ────────────────────────────────────────────────────────
  const currentStatus = booking.status as BookingStatus
  const allowed = isHost
    ? HOST_TRANSITIONS[currentStatus]
    : USER_TRANSITIONS[currentStatus]

  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from '${currentStatus}' to '${newStatus}'` },
      { status: 400 }
    )
  }

  // completed는 호스트만 가능
  if (newStatus === 'completed' && !isHost) {
    return NextResponse.json({ error: 'Only host can mark booking as completed' }, { status: 403 })
  }

  // completed 전환 시 결제 금액 필수 (수익 누수 방지: 외부 현금 거래 후 무수수료 완료 차단)
  if (newStatus === 'completed' && (!booking.amount || Number(booking.amount) <= 0)) {
    return NextResponse.json({ error: 'Payment must be completed before marking booking as done' }, { status: 400 })
  }

  // ── 상태 업데이트 (atomic: current status 조건 추가로 race condition 방지) ──
  const { data: updated, error: updateErr } = await supabaseService
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', id)
    .eq('status', currentStatus)
    .select('id, status, updated_at')
    .maybeSingle()

  if (updateErr) {
    console.error('[bookings/status PATCH] update error:', updateErr.code)
    return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Booking status was already changed by another request' }, { status: 409 })
  }

  // completed → 커미션 자동 생성 (fire-and-forget)
  // booking.amount = 실제 결제 금액 (서비스 현재 가격이 아닌 예약 시점 금액 기준)
  if (newStatus === 'completed' && booking.amount) {
    void (async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
        if (!baseUrl) return
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
        await fetch(`${baseUrl}/api/commissions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-service-key': serviceKey },
          body: JSON.stringify({
            booking_id: id,
            gross_amount: Number(booking.amount),
            currency: booking.currency ?? 'KRW',
          }),
        })
      } catch (e) {
        // 커미션 실패는 상태 변경 성공에 영향 없음 (에러 코드만 로그)
        console.error('[bookings/status] commission trigger error:', (e as Error).message)
      }
    })()
  }

  // cancelled → 커미션 환불 + Stripe 환불 처리
  if (newStatus === 'cancelled') {
    // 1) 커미션 행 삭제 (confirmed→cancelled 시 선행 커미션 없음, 방어 삭제)
    void (async () => {
      try {
        await supabaseService
          .from('booking_commissions')
          .delete()
          .eq('booking_id', id)
      } catch (e) {
        console.error('[bookings/status] commission reversal error:', (e as Error).message)
      }
    })()

    // 2) Stripe 환불 (payment_intent_id가 있고 paid 상태인 경우만)
    // 취소 주체: 호스트 취소 → 전액 환불, 사용자 취소 → 정책에 따라 부분 환불
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const paymentIntentId = (booking as any).payment_intent_id as string | null
    const paymentStatus = (booking as any).payment_status as string | null
    if (stripeKey && paymentIntentId && paymentStatus === 'paid') {
      void (async () => {
        try {
          const { default: Stripe } = await import('stripe')
          const stripe = new Stripe(stripeKey, { apiVersion: '2025-07-30.basil' })
          const amount = booking.amount ? Number(booking.amount) : 0
          // 호스트 취소: 전액 환불 / 사용자 취소: 24h+ 전 전액, 당일 50%
          let refundAmount: number | undefined
          if (isHost) {
            refundAmount = undefined // 전액 환불 (amount 미지정 = 전액)
          } else {
            const bookedAtMs = new Date((booking as any).booked_at ?? Date.now()).getTime()
            const hoursUntil = (bookedAtMs - Date.now()) / 36e5
            refundAmount = hoursUntil >= 24
              ? undefined // 전액
              : Math.round(amount * 0.5) // 50% 환불 (Stripe: 최소 통화 단위 기준)
          }
          const refundParams: Parameters<typeof stripe.refunds.create>[0] = {
            payment_intent: paymentIntentId,
          }
          if (refundAmount !== undefined) refundParams.amount = refundAmount
          await stripe.refunds.create(refundParams)

          // payment_status 갱신
          const finalStatus = refundAmount === undefined ? 'refunded' : 'partially_refunded'
          await supabaseService
            .from('bookings')
            .update({ payment_status: finalStatus })
            .eq('id', id)
        } catch (e) {
          console.error('[bookings/status] stripe refund error:', (e as Error).message)
        }
      })()
    }
  }

  // Fire-and-forget 알림
  // confirmed → 사용자에게, cancelled → 양측에게, completed → 사용자에게
  const notifyUserId = newStatus === 'confirmed' || newStatus === 'completed'
    ? booking.guest_id
    : null
  const notifyHostId = newStatus === 'cancelled' ? booking.host_id : null
  const notifyGuestId = newStatus === 'cancelled' ? booking.guest_id : null

  if (notifyUserId) {
    void sendStatusNotification(req, { recipientId: notifyUserId, newStatus, bookingId: id })
  }
  if (notifyHostId) {
    void sendStatusNotification(req, { recipientId: notifyHostId, newStatus, bookingId: id })
  }
  if (notifyGuestId && notifyGuestId !== notifyHostId) {
    void sendStatusNotification(req, { recipientId: notifyGuestId, newStatus, bookingId: id })
  }

  // 이메일 알림 (confirmed/cancelled만)
  if (newStatus === 'confirmed' && booking.guest_id) {
    void sendBookingEmail(req, { booking_id: id, type: 'confirmed', recipient_id: booking.guest_id })
  } else if (newStatus === 'cancelled') {
    if (booking.guest_id) void sendBookingEmail(req, { booking_id: id, type: 'cancelled', recipient_id: booking.guest_id })
    if (booking.host_id) void sendBookingEmail(req, { booking_id: id, type: 'cancelled', recipient_id: booking.host_id })
  }

  return NextResponse.json({ data: updated })
}
