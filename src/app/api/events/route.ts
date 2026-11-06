import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid, hasForbiddenContent } from '@src/lib/commerce'
import { detectExternalPlatform } from '@src/lib/chat-safety'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

const ALLOWED_EVENT_TYPES = ['dinner', 'cafe', 'activity', 'travel', 'online', 'other']
const MAX_PARTICIPANTS_LIMIT = 100

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`events-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('type')
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 50)
  const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)
  const offset = Math.min(Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0, 10000)

  try {
    let query = supabaseService
      .from('events')
      .select(`
        *,
        profiles!events_host_id_fkey (id, full_name, avatar_url),
        partner_venues (id, name, category, address, image_url, discount_price)
      `)
      .eq('status', 'open')
      .gt('event_datetime', new Date().toISOString())
      .order('event_datetime', { ascending: true })
      .range(offset, offset + limit - 1)

    if (eventType) {
      if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
      }
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })

    return NextResponse.json({ events: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const postIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const postRl = await checkRateLimit(`events-post:${postIp}`, 'general')
  if (!postRl.allowed) {
    const r = rateLimitResponse(postRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 이벤트 생성은 성인 인증 필수
  const { data: eventCreatorProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!eventCreatorProfile?.is_adult) {
    return NextResponse.json({ error: 'Age verification required', redirect: '/onboarding/verify-age' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      eventType, title, description, venueType, venueId,
      customLocation, eventDatetime, maxParticipants, feePerPerson,
    } = body

    if (!eventType || !title || !venueType || !eventDatetime || !maxParticipants) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }
    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }
    if (!['partner', 'custom'].includes(venueType)) {
      return NextResponse.json({ error: 'Invalid venue type' }, { status: 400 })
    }
    if (venueType === 'partner' && !venueId) {
      return NextResponse.json({ error: 'Please select a partner venue' }, { status: 400 })
    }
    if (venueType === 'partner' && !isValidUuid(venueId)) {
      return NextResponse.json({ error: 'Invalid venueId' }, { status: 400 })
    }
    if (venueType === 'custom' && !customLocation) {
      return NextResponse.json({ error: 'Please enter a location' }, { status: 400 })
    }
    if (typeof title !== 'string' || title.length > 100) {
      return NextResponse.json({ error: 'title must be under 100 characters' }, { status: 400 })
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return NextResponse.json({ error: 'description must be under 2000 characters' }, { status: 400 })
    }
    if (hasForbiddenContent(title) || hasForbiddenContent(description ?? '')) {
      return NextResponse.json({ error: 'Content contains prohibited keywords' }, { status: 400 })
    }
    if (detectExternalPlatform(title) || detectExternalPlatform(description ?? '')) {
      return NextResponse.json({ error: 'External platform referral not allowed' }, { status: 400 })
    }
    if (customLocation && (typeof customLocation !== 'string' || customLocation.length > 500)) {
      return NextResponse.json({ error: 'customLocation must be under 500 characters' }, { status: 400 })
    }
    const parsedDatetime = new Date(eventDatetime)
    if (isNaN(parsedDatetime.getTime()) || parsedDatetime <= new Date()) {
      return NextResponse.json({ error: 'eventDatetime must be a valid future datetime' }, { status: 400 })
    }
    const parsedMax = Number(maxParticipants)
    if (!Number.isInteger(parsedMax) || parsedMax < 2 || parsedMax > MAX_PARTICIPANTS_LIMIT) {
      return NextResponse.json({ error: `maxParticipants must be between 2 and ${MAX_PARTICIPANTS_LIMIT}` }, { status: 400 })
    }
    // feePerPerson 검증: 0 이상 양수, 상한선 1,000,000 (통화 단위)
    if (feePerPerson !== undefined && feePerPerson !== null) {
      if (typeof feePerPerson !== 'number' || !Number.isFinite(feePerPerson) || feePerPerson < 0 || feePerPerson > 1_000_000) {
        return NextResponse.json({ error: 'feePerPerson must be a number between 0 and 1,000,000' }, { status: 400 })
      }
    }

    // 프리미엄 회원 검증
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (!profile?.is_premium) {
      return NextResponse.json({ error: 'Only premium members can create events' }, { status: 403 })
    }

    const { data: event, error } = await supabaseService
      .from('events')
      .insert({
        host_id: user.id,
        event_type: eventType,
        title,
        description: description ?? null,
        venue_type: venueType,
        venue_id: venueType === 'partner' ? venueId : null,
        custom_location: venueType === 'custom' ? customLocation : null,
        event_datetime: parsedDatetime.toISOString(),
        max_participants: maxParticipants,
        fee_per_person: feePerPerson ?? 0,
      })
      .select('id, host_id, event_type, title, description, venue_type, venue_id, custom_location, event_datetime, max_participants, fee_per_person, status, created_at')
      .single()

    if (error || !event) {
      console.error('[events/POST] insert error:', error?.code)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    // 팔로워에게 알림 발송
    const { data: followers } = await supabaseService
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)

    if (followers && followers.length > 0) {
      await supabaseService.from('event_notifications').insert(
        followers.map((f) => ({ event_id: event.id, recipient_id: f.follower_id }))
      )
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
