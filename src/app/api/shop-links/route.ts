import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, ALLOWED_DOMAINS, isAllowedUrl, getAuthUser, hasForbiddenContent, isValidUuid } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 호스트 외부 쇼핑 링크 목록
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`shop-links-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('host_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  if (!hostId) {
    return NextResponse.json({ error: 'host_id is required' }, { status: 400 })
  }
  if (!isValidUuid(hostId)) {
    return NextResponse.json({ error: 'Invalid host_id' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('host_shop_links')
    .select('id, title, description, external_platform, images, original_price, sale_price, click_count, is_featured, expires_at, created_at')
    .eq('host_id', hostId)
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: 'Failed to fetch shop links' }, { status: 500 })

  return NextResponse.json({ links: data ?? [] })
}

// 쇼핑 링크 등록 (호스트 전용)
export async function POST(req: NextRequest) {
  const postIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const postRl = await checkRateLimit(`shop-links-post:${postIp}`, 'general')
  if (!postRl.allowed) {
    const r = rateLimitResponse(postRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 쇼핑 링크 등록은 성인 인증 필수
  const { data: hostProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!hostProfile?.is_adult) {
    return NextResponse.json({ error: 'Age verification required', redirect: '/onboarding/verify-age' }, { status: 403 })
  }

  try {
    const { title, description, external_url, external_platform, images, original_price, sale_price, expires_at } = await req.json()

    if (!title || !external_url) {
      return NextResponse.json({ error: 'Required fields missing: title, external_url' }, { status: 400 })
    }

    if (!isAllowedUrl(external_url)) {
      return NextResponse.json(
        { error: `External URL not allowed. Supported platforms: ${ALLOWED_DOMAINS.slice(0, 5).join(', ')} ` },
        { status: 400 }
      )
    }

    // 금지 콘텐츠 필터 (도박/성인/불법)
    const contentToCheck = `${title} ${description ?? ''}`
    if (hasForbiddenContent(contentToCheck)) {
      return NextResponse.json({ error: 'Content violates platform rules' }, { status: 400 })
    }

    // 호스트 1인 활성 링크 최대 20개 제한
    const { count } = await supabaseService
      .from('host_shop_links')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', user.id)
      .eq('status', 'active')

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: 'Maximum 20 active links allowed' }, { status: 409 })
    }

    const { data: link, error: insertErr } = await supabaseService
      .from('host_shop_links')
      .insert({
        host_id: user.id,
        title: title.slice(0, 100),
        description: description?.slice(0, 500) ?? null,
        external_url,
        external_platform: external_platform ?? 'other',
        images: images ?? [],
        original_price: original_price ?? null,
        sale_price: sale_price ?? null,
        expires_at: expires_at ?? null,
        status: 'active',
        click_count: 0,
        is_featured: false,
      })
      .select('id, title, external_platform, click_count, created_at')
      .single()

    if (insertErr) return NextResponse.json({ error: 'Failed to create shop link' }, { status: 500 })

    return NextResponse.json({ link }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
