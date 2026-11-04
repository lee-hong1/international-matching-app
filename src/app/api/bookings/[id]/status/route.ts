import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@/lib/ratelimit'

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

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

  return NextResponse.json({ data: updated })
}
