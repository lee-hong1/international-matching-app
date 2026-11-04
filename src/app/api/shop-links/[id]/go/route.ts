import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseService, isAllowedUrl, isValidUuid } from '@/lib/commerce'

// 클릭 추적 리디렉션 — 외부 URL로 보내기 전에 클릭수 카운트
// GET /api/shop-links/:id/go
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isValidUuid(params.id)) {
    return NextResponse.json({ error: '유효하지 않은 링크 ID입니다' }, { status: 400 })
  }

  const { data: link } = await supabaseService
    .from('host_shop_links')
    .select('id, external_url, status, expires_at')
    .eq('id', params.id)
    .single()

  if (!link || link.status !== 'active') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    await supabaseService.from('host_shop_links').update({ status: 'expired' }).eq('id', params.id)
    return NextResponse.json({ error: '만료된 링크입니다' }, { status: 410 })
  }

  // DB에 저장된 URL을 리디렉션 직전 재검증 (등록 후 DB 조작 방어)
  if (!isAllowedUrl(link.external_url)) {
    return NextResponse.json({ error: '유효하지 않은 외부 URL입니다' }, { status: 400 })
  }

  // 익명화된 클릭 로그 — 연산자 우선순위 주의: (ip + salt) ?? fallback
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const salt = process.env.CLICK_SALT ?? 'default-salt'
  const ipHash = createHash('sha256').update(ip + salt).digest('hex').slice(0, 16)

  // 중복 클릭 방지 (같은 IP 해시 10분 내 재클릭 무효)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recentClick } = await supabaseService
    .from('shop_link_clicks')
    .select('id')
    .eq('link_id', params.id)
    .eq('ip_hash', ipHash)
    .gte('created_at', tenMinAgo)
    .single()

  if (!recentClick) {
    await Promise.all([
      supabaseService.from('shop_link_clicks').insert({ link_id: params.id, ip_hash: ipHash }),
      supabaseService.rpc('increment_link_clicks', { p_link_id: params.id }),
    ])
  }

  // 외부 사이트로 리디렉션 (301이 아닌 302 — 플랫폼이 중개자임을 명확히)
  return NextResponse.redirect(link.external_url, { status: 302 })
}
