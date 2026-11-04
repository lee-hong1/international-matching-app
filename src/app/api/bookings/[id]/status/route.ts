import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@/lib/ratelimit'
import { t, type Lang } from '@/lib/i18n'

async function sendBookingEmail(
  req: NextRequest,
  opts: { booking_id: string; type: 'confirmed' | 'cancelled'; recipient_id: string }
): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
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
  req: NextRequest,
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
    await fetch(`${baseUrl}/api/send-notification`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
  { params }: { params: { id: string } }
) {
  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`status:${ip}`, 'general')
  if (!rl.success) return rateLimitResponse(rl)

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── UUID 검증 ──────────────────────────────────────────────────────────────
  const { id } = params
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

  const { status: newStatus } = body
  const VALID_STATUSES: BookingStatus[] = ['confirmed', 'cancelled', 'completed']
  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // ── 예약 조회 ─────────────────────────────────────────────────────────────
  const { data: booking, error: fetchErr } = await supabaseService
    .from('bookings')
    .select('id, user_id, host_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // ── 역할 판단 ─────────────────────────────────────────────────────────────
  const isHost = booking.host_id === user.id
  const isUser = booking.user_id === user.id
  if (!isHost && !isUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  // ── 상태 업데이트 ─────────────────────────────────────────────────────────
  const { data: updated, error: updateErr } = await supabaseService
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', id)
    .select('id, status, updated_at')
    .single()

  if (updateErr) {
    console.error('[bookings/status PATCH] update error:', updateErr.code)
    return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
  }

  // completed → 커미션 자동 생성 (fire-and-forget)
  if (newStatus === 'completed') {
    void (async () => {
      try {
        const { data: service } = await supabaseService
          .from('bookings')
          .select('service_id')
          .eq('id', id)
          .single()
        if (service?.service_id) {
          const { data: svc } = await supabaseService
            .from('services')
            .select('price, currency')
            .eq('id', service.service_id)
            .single()
          if (svc?.price) {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get('host')}`
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
            await fetch(`${baseUrl}/api/commissions`, {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-service-key': serviceKey },
              body: JSON.stringify({
                booking_id: id,
                gross_amount: Number(svc.price),
                currency: svc.currency ?? 'KRW',
              }),
            })
          }
        }
      } catch (e) {
        // 커미션 실패는 상태 변경 성공에 영향 없음 (에러 코드만 로그)
        console.error('[bookings/status] commission trigger error:', (e as Error).message)
      }
    })()
  }

  // Fire-and-forget 알림
  // confirmed → 사용자에게, cancelled → 양측에게, completed → 사용자에게
  const notifyUserId = newStatus === 'confirmed' || newStatus === 'completed'
    ? booking.user_id
    : null
  const notifyHostId = newStatus === 'cancelled' ? booking.host_id : null
  const notifyGuestId = newStatus === 'cancelled' ? booking.user_id : null

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
  if (newStatus === 'confirmed' && booking.user_id) {
    void sendBookingEmail(req, { booking_id: id, type: 'confirmed', recipient_id: booking.user_id })
  } else if (newStatus === 'cancelled') {
    if (booking.user_id) void sendBookingEmail(req, { booking_id: id, type: 'cancelled', recipient_id: booking.user_id })
    if (booking.host_id) void sendBookingEmail(req, { booking_id: id, type: 'cancelled', recipient_id: booking.host_id })
  }

  return NextResponse.json({ data: updated })
}
