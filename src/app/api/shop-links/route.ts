import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

// 허용 외부 도메인 (allowlist — 악성 URL 등록 방지)
const ALLOWED_DOMAINS = [
  'smartstore.naver.com', 'brand.naver.com', 'shopping.naver.com',
  'coupang.com', 'kakao.com', 'kakaostore.com', 'gift.kakao.com',
  '29cm.co.kr', 'musinsa.com', 'ably.team', 'zigzag.kr',
  'instagram.com', 'linktr.ee', 'ohou.se', 'idus.com',
]

function isAllowedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// 호스트 외부 쇼핑 링크 목록
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('host_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  if (!hostId) {
    return NextResponse.json({ error: 'host_id가 필요합니다' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('host_shop_links')
    .select('id, title, description, external_platform, images, original_price, sale_price, click_count, is_featured, expires_at, created_at')
    .eq('host_id', hostId)
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ links: data ?? [] })
}

// 쇼핑 링크 등록 (호스트 전용)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  try {
    const { title, description, external_url, external_platform, images, original_price, sale_price, expires_at } = await req.json()

    if (!title || !external_url) {
      return NextResponse.json({ error: '필수 항목 누락: title, external_url' }, { status: 400 })
    }

    if (!isAllowedUrl(external_url)) {
      return NextResponse.json(
        { error: '허용되지 않은 외부 URL입니다. 지원 플랫폼: 네이버스마트스토어, 쿠팡, 카카오 등' },
        { status: 400 }
      )
    }

    // 호스트 1인 활성 링크 최대 20개 제한
    const { count } = await supabase
      .from('host_shop_links')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', user.id)
      .eq('status', 'active')

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: '활성 링크는 최대 20개까지 등록 가능합니다' }, { status: 409 })
    }

    const { data: link, error: insertErr } = await supabase
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

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    return NextResponse.json({ link }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
