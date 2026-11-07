import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isValidUuid, getAuthUser, supabaseService } from '@src/lib/commerce'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`events-id-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('events')
    .select(`
      id, host_id, event_type, title, description, venue_type, venue_id, custom_location,
      event_datetime, max_participants, fee_per_person, status, is_featured, boost_expires_at,
      participants_count, created_at, updated_at,
      profiles!events_host_id_fkey (id, full_name, avatar_url),
      partner_venues (id, name, category, address, image_url, discount_price, capacity)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json({ event: data })
}
