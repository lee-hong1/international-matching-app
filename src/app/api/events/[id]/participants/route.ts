import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

const ALLOWED_ACTIONS = ['approved', 'rejected'] as const
type ParticipantAction = typeof ALLOWED_ACTIONS[number]

/**
 * PATCH /api/events/[id]/participants
 * 호스트가 무료 이벤트 신청(pending)을 승인/거절.
 * 유료 이벤트(pending_payment)는 결제 완료 후 자동 처리되므로 대상 외.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`event-participants-patch:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  const { id: eventId } = await params
  if (!isValidUuid(eventId)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  let participantId: string, action: ParticipantAction
  try {
    const body = await request.json()
    participantId = body.participant_id
    action = body.action
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!participantId || !isValidUuid(participantId)) {
    return NextResponse.json({ error: 'Valid participant_id required' }, { status: 400 })
  }
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 })
  }

  // 이벤트 호스트 확인 (IDOR 방지)
  const { data: event, error: eventError } = await supabaseService
    .from('events')
    .select('id, host_id, fee_per_person')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  if (event.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can manage participants' }, { status: 403 })
  }

  // 유료 이벤트는 이 엔드포인트로 처리 불가
  if (event.fee_per_person && event.fee_per_person > 0) {
    return NextResponse.json({ error: 'Paid event participants are managed via payment flow' }, { status: 400 })
  }

  // 대상 participant 확인 — 반드시 이 이벤트의 pending 신청이어야 함
  const { data: participant, error: participantError } = await supabaseService
    .from('event_participants')
    .select('id, event_id, user_id, status')
    .eq('id', participantId)
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .single()

  if (participantError || !participant) {
    return NextResponse.json({ error: 'Pending participant not found for this event' }, { status: 404 })
  }

  const { data: updated, error: updateError } = await supabaseService
    .from('event_participants')
    .update({ status: action })
    .eq('id', participantId)
    .select('id, event_id, user_id, status')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to update participant status' }, { status: 500 })
  }

  // 신청자에게 알림 발송 (fire-and-forget)
  const notifTitle = action === 'approved' ? '이벤트 신청 승인' : '이벤트 신청 거절'
  const notifBody = action === 'approved'
    ? '이벤트 참가 신청이 승인되었습니다.'
    : '이벤트 참가 신청이 거절되었습니다.'
  void supabaseService.from('notifications').insert({
    user_id: participant.user_id,
    type: 'system',
    title: notifTitle,
    body: notifBody,
    is_read: false,
  })

  return NextResponse.json({ participant: updated })
}

/**
 * GET /api/events/[id]/participants
 * 호스트 전용: 이벤트 신청자 목록 조회.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`event-participants-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { id: eventId } = await params
  if (!isValidUuid(eventId)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  // 호스트 본인 확인 (IDOR)
  const { data: event, error: eventError } = await supabaseService
    .from('events')
    .select('id, host_id')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  if (event.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can view participants' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const VALID_STATUSES = ['pending', 'pending_payment', 'approved', 'rejected', 'cancelled']
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
  }

  let query = supabaseService
    .from('event_participants')
    .select(`
      id, user_id, status, payment_id, created_at,
      profiles!event_participants_user_id_fkey (full_name, avatar_url, country)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })

  return NextResponse.json({ participants: data ?? [] })
}
