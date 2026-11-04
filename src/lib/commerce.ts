import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

export const ALLOWED_DOMAINS = [
  'smartstore.naver.com', 'brand.naver.com', 'shopping.naver.com',
  'coupang.com', 'kakao.com', 'kakaostore.com', 'gift.kakao.com',
  '29cm.co.kr', 'musinsa.com', 'ably.team', 'zigzag.kr',
  'instagram.com', 'linktr.ee', 'ohou.se', 'idus.com',
]

const ALLOWED_PROTOCOLS = new Set(['https:'])

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return false
    const { hostname } = parsed
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseService.auth.getUser(token)
  return user
}
