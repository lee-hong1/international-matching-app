import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isAllowedUrl, getAuthUser, hasForbiddenContent, isValidUuid } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 판매 이벤트/공구 공지 목록 (발견 피드)
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`sales-events-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { searchParams } = new URL(req.url)
  const eventType = searchParams.get('type')
  const hostId = searchParams.get('host_id')
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 100)
  const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)
  const offset = Math.min(Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0, 10000)

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

  const VALID_EVENT_TYPES = ['groupbuy', 'flash_sale', 'limited', 'presale', 'collaboration']
  if (eventType) {
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_EVENT_TYPES.join(', ')}` }, { status: 400 })
    }
    query = query.eq('event_type', eventType)
  }
  if (hostId) {
    // isValidUuid import 필요 — supabaseService와 같은 모듈에서 가져옴
    if (!isValidUuid(hostId)) {
      return NextResponse.json({ error: 'Invalid host_id' }, { status: 400 })
    }
    query = query.eq('host_id', hostId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch sales events' }, { status: 500 })

  return NextResponse.json({ events: data ?? [] })
}

// 판매 이벤트/공구 공지 등록 (호스트 전용)
export async function POST(req: NextRequest) {
  const postIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const postRl = await checkRateLimit(`sales-events-post:${postIp}`, 'general')
  if (!postRl.allowed) {
    const r = rateLimitResponse(postRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 판매 이벤트 생성은 성인 인증 필수
  const { data: saleCreatorProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!saleCreatorProfile?.is_adult) {
    return NextResponse.json({ error: 'Age verification required', redirect: '/onboarding/verify-age' }, { status: 403 })
  }

  try {
    const {
      event_type, title, description, external_url, external_platform,
      images, original_price, event_price, starts_at, ends_at, min_participants,
    } = await req.json()

    if (!event_type || !title || !external_url || !ends_at) {
      return NextResponse.json(
        { error: 'Required fields missing: event_type, title, external_url, ends_at' },
        { status: 400 }
      )
    }

    const validTypes = ['groupbuy', 'flash_sale', 'limited', 'presale', 'collaboration']
    if (!validTypes.includes(event_type)) {
      return NextResponse.json({ error: `event_type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    if (!isAllowedUrl(external_url)) {
      return NextResponse.json(
        { error: 'External URL not allowed' },
        { status: 400 }
      )
    }

    // youtube 제거: youtube.com은 ALLOWED_DOMAINS에 없어서 isAllowedUrl에서 항상 거부됨 → 혼란 방지
    const VALID_PLATFORMS = ['coupang', 'naver', 'kakao', 'instagram', 'other']
    if (external_platform && !VALID_PLATFORMS.includes(external_platform)) {
      return NextResponse.json({ error: `external_platform must be one of: ${VALID_PLATFORMS.join(', ')}` }, { status: 400 })
    }

    if (images !== undefined) {
      if (!Array.isArray(images) || images.length > 10 || images.some((img: unknown) => typeof img !== 'string' || img.length > 2048)) {
        return NextResponse.json({ error: 'images must be an array of up to 10 URL strings' }, { status: 400 })
      }
    }

    // 금지 콘텐츠 필터 (도박/성인/불법)
    const contentToCheck = `${title} ${description ?? ''}`
    if (hasForbiddenContent(contentToCheck)) {
      return NextResponse.json({ error: 'Content violates platform rules' }, { status: 400 })
    }

    if (original_price !== undefined && original_price !== null) {
      if (typeof original_price !== 'number' || !Number.isFinite(original_price) || original_price < 0) {
        return NextResponse.json({ error: 'original_price must be a non-negative number' }, { status: 400 })
      }
    }
    if (event_price !== undefined && event_price !== null) {
      if (typeof event_price !== 'number' || !Number.isFinite(event_price) || event_price < 0) {
        return NextResponse.json({ error: 'event_price must be a non-negative number' }, { status: 400 })
      }
    }
    if (min_participants !== undefined && min_participants !== null) {
      if (!Number.isInteger(min_participants) || min_participants < 2 || min_participants > 10000) {
        return NextResponse.json({ error: 'min_participants must be an integer between 2 and 10,000' }, { status: 400 })
      }
    }

    if (new Date(ends_at) <= new Date()) {
      return NextResponse.json({ error: 'ends_at must be a future date' }, { status: 400 })
    }

    const startsAt = starts_at ?? new Date().toISOString()

    if (new Date(ends_at) <= new Date(startsAt)) {
      return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 })
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

    if (insertErr) return NextResponse.json({ error: 'Failed to create sales event' }, { status: 500 })

    return NextResponse.json({ event }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
