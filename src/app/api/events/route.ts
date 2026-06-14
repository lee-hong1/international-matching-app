import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const eventType = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    let query = supabase
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
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      eventType, title, description, venueType, venueId,
      customLocation, eventDatetime, maxParticipants, feePerPerson,
    } = body

    if (!eventType || !title || !venueType || !eventDatetime || !maxParticipants) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }
    if (venueType === 'partner' && !venueId) {
      return NextResponse.json({ error: '제휴 매장을 선택해주세요' }, { status: 400 })
    }
    if (venueType === 'custom' && !customLocation) {
      return NextResponse.json({ error: '장소를 입력해주세요' }, { status: 400 })
    }

    // 프리미엄 회원 검증
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (!profile?.is_premium) {
      return NextResponse.json({ error: '유료 회원만 이벤트를 만들 수 있습니다' }, { status: 403 })
    }

    const { data: event, error } = await supabase
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
      return NextResponse.json({ error: error?.message ?? '이벤트 생성에 실패했습니다' }, { status: 500 })
    }

    // 팔로워에게 알림 발송
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)

    if (followers && followers.length > 0) {
      await supabase.from('event_notifications').insert(
        followers.map((f) => ({ event_id: event.id, recipient_id: f.follower_id }))
      )
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
