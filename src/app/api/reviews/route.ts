import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'
import { detectExternalPlatform } from '@src/lib/chat-safety'

/**
 * GET /api/reviews?host_id=xxx
 * 호스트의 공개 리뷰 목록 (cursor 페이지네이션).
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`reviews-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('host_id')
  const reviewerId = searchParams.get('reviewer_id')
  const cursor = searchParams.get('cursor')
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 50)

  if (!hostId && !reviewerId) {
    return NextResponse.json({ error: 'host_id or reviewer_id required' }, { status: 400 })
  }
  if (hostId && !isValidUuid(hostId)) {
    return NextResponse.json({ error: 'Invalid host_id' }, { status: 400 })
  }
  if (reviewerId && !isValidUuid(reviewerId)) {
    return NextResponse.json({ error: 'Invalid reviewer_id' }, { status: 400 })
  }

  let query = supabaseService
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id, reviewee_id, profiles!reviewer_id(display_name, country)')
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (hostId) {
    query = query.eq('reviewee_id', hostId).eq('is_public', true)
  } else if (reviewerId) {
    query = query.eq('reviewer_id', reviewerId)
  }

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

  const { data, error } = await query

  if (error) {
    console.error('reviews GET error:', error.code)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }

  const hasMore = data.length > limit
  const rows = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ created_at: rows.at(-1)!.created_at, id: rows.at(-1)!.id })).toString('base64')
    : null

  return NextResponse.json({ data: rows, has_more: hasMore, next_cursor: nextCursor })
}

/**
 * POST /api/reviews
 * 리뷰 작성. 완료된 예약의 당사자만 가능.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`reviews-post:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 성인 인증 필수
  const { data: reviewerProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!reviewerProfile?.is_adult) {
    return NextResponse.json({ error: 'Age verification required', redirect: '/onboarding/verify-age' }, { status: 403 })
  }

  let body: { booking_id?: string; rating?: number; comment?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { booking_id, rating, comment } = body

  if (!booking_id || !isValidUuid(booking_id)) {
    return NextResponse.json({ error: 'Valid booking_id required' }, { status: 400 })
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: 'rating must be integer 1-5' }, { status: 400 })
  }
  if (comment !== undefined && comment !== null && (typeof comment !== 'string' || comment.length > 1000)) {
    return NextResponse.json({ error: 'comment must be a string under 1000 characters' }, { status: 400 })
  }
  if (comment && detectExternalPlatform(comment)) {
    return NextResponse.json({ error: 'External platform referral not allowed' }, { status: 400 })
  }

  // 예약 조회 — reviewer가 user인지 host인지 확인
  const { data: booking, error: bookingErr } = await supabaseService
    .from('bookings')
    .select('id, user_id, host_id, status')
    .eq('id', booking_id)
    .single()

  if (bookingErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'Can only review completed bookings' }, { status: 400 })
  }
  if (booking.user_id !== user.id && booking.host_id !== user.id) {
    return NextResponse.json({ error: 'Not a party to this booking' }, { status: 403 })
  }

  // reviewer → reviewee 판별
  const reviewee_id = booking.user_id === user.id ? booking.host_id : booking.user_id

  const { data: review, error: insertErr } = await supabaseService
    .from('reviews')
    .insert({
      booking_id,
      reviewer_id: user.id,
      reviewee_id,
      rating,
      comment: comment ?? null,
      is_public: true,
    })
    .select('id, rating, reviewee_id, created_at')
    .single()

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'Review already exists for this booking' }, { status: 409 })
    }
    console.error('review insert error:', insertErr.code)
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
  }

  return NextResponse.json({ data: review }, { status: 201 })
}
