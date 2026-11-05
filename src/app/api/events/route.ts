import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

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
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)

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

    if (eventType) query = query.eq('event_type', eventType)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

  try {
    const body = await request.json()
    const {
      eventType, title, description, venueType, venueId,
      customLocation, eventDatetime, maxParticipants, feePerPerson,
    } = body

    if (!eventType || !title || !venueType || !eventDatetime || !maxParticipants) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }
    if (venueType === 'partner' && !venueId) {
      return NextResponse.json({ error: 'Please select a partner venue' }, { status: 400 })
    }
    if (venueType === 'custom' && !customLocation) {
      return NextResponse.json({ error: 'Please enter a location' }, { status: 400 })
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
        event_datetime: eventDatetime,
        max_participants: maxParticipants,
        fee_per_person: feePerPerson ?? 0,
      })
      .select()
      .single()

    if (error || !event) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create event' }, { status: 500 })
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
