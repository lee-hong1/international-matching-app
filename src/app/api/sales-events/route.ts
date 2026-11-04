import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isAllowedUrl, getAuthUser } from '@/lib/commerce'

// 판매 이벤트/공구 공지 목록 (발견 피드)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventType = searchParams.get('type')
  const hostId = searchParams.get('host_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  let query = supabaseService
    .from('sales_events')
    .select(`
      id, event_type, title, description, external_platform,
      images, original_price, event_price, starts_at, ends_at,
      min_participants, click_count, is_featured, created_at,
      profiles!sales_events_host_id_fkey(id, full_name, avatar_url, tier)
    `)
    .in('status', ['upcoming', 'active'])
    .gte('ends_at', new Date().toISOString())
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (eventType) query = query.eq('event_type', eventType)
  if (hostId) query = query.eq('host_id', hostId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data ?? [] })
}

// 판매 이벤트/공구 공지 등록 (호스트 전용)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  try {
    const {
      event_type, title, description, external_url, external_platform,
      images, original_price, event_price, starts_at, ends_at, min_participants,
    } = await req.json()

    if (!event_type || !title || !external_url || !ends_at) {
      return NextResponse.json(
        { error: '필수 항목 누락: event_type, title, external_url, ends_at' },
        { status: 400 }
      )
    }

    const validTypes = ['groupbuy', 'flash_sale', 'limited', 'presale', 'collaboration']
    if (!validTypes.includes(event_type)) {
      return NextResponse.json({ error: `event_type은 다음 중 하나: ${validTypes.join(', ')}` }, { status: 400 })
    }

    if (!isAllowedUrl(external_url)) {
      return NextResponse.json(
        { error: '허용되지 않은 외부 URL입니다' },
        { status: 400 }
      )
    }

    if (new Date(ends_at) <= new Date()) {
      return NextResponse.json({ error: '종료일은 미래여야 합니다' }, { status: 400 })
    }

    const startsAt = starts_at ?? new Date().toISOString()

    if (new Date(ends_at) <= new Date(startsAt)) {
      return NextResponse.json({ error: '종료일은 시작일보다 이후여야 합니다' }, { status: 400 })
    }

    const status = new Date(startsAt) <= new Date() ? 'active' : 'upcoming'

    const { data: event, error: insertErr } = await supabaseService
      .from('sales_events')
      .insert({
        host_id: user.id,
        event_type,
        title: title.slice(0, 100),
        description: description?.slice(0, 1000) ?? null,
        external_url,
        external_platform: external_platform ?? 'other',
        images: images ?? [],
        original_price: original_price ?? null,
        event_price: event_price ?? null,
        starts_at: startsAt,
        ends_at,
        min_participants: min_participants ?? null,
        status,
        click_count: 0,
        is_featured: false,
      })
      .select('id, event_type, title, status, starts_at, ends_at')
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    return NextResponse.json({ event }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
