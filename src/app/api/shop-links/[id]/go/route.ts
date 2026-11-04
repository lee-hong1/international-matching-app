import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

// 클릭 추적 리디렉션 — 외부 URL로 보내기 전에 클릭수 카운트
// GET /api/shop-links/:id/go
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: link } = await supabase
    .from('host_shop_links')
    .select('id, external_url, status, expires_at')
    .eq('id', params.id)
    .single()

  if (!link || link.status !== 'active') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    await supabase.from('host_shop_links').update({ status: 'expired' }).eq('id', params.id)
    return NextResponse.json({ error: '만료된 링크입니다' }, { status: 410 })
  }

  // 익명화된 클릭 로그 (IP 해시 — 개인정보 미저장)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const ipHash = createHash('sha256').update(ip + process.env.CLICK_SALT ?? 'salt').digest('hex').slice(0, 16)

  // 중복 클릭 방지 (같은 IP 해시 10분 내 재클릭 무효)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recentClick } = await supabase
    .from('shop_link_clicks')
    .select('id')
    .eq('link_id', params.id)
    .eq('ip_hash', ipHash)
    .gte('created_at', tenMinAgo)
    .single()

  if (!recentClick) {
    await Promise.all([
      supabase.from('shop_link_clicks').insert({ link_id: params.id, ip_hash: ipHash }),
      supabase.rpc('increment_link_clicks', { p_link_id: params.id }),
    ])
  }

  // 외부 사이트로 리디렉션 (301이 아닌 302 — 플랫폼이 중개자임을 명확히)
  return NextResponse.redirect(link.external_url, { status: 302 })
}
