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

// ── i18n error messages ──────────────────────────────────────────────────────

type Lang = 'ko' | 'en' | 'ja' | 'zh'

const ERRORS: Record<string, Record<Lang, string>> = {
  auth_required: {
    ko: '인증이 필요합니다',
    en: 'Authentication required',
    ja: '認証が必要です',
    zh: '需要身份验证',
  },
  forbidden: {
    ko: '권한이 없습니다',
    en: 'Forbidden',
    ja: 'アクセス権限がありません',
    zh: '没有权限',
  },
  not_found: {
    ko: '리소스를 찾을 수 없습니다',
    en: 'Resource not found',
    ja: 'リソースが見つかりません',
    zh: '找不到资源',
  },
  url_not_allowed: {
    ko: '허용되지 않은 외부 URL입니다',
    en: 'External URL not allowed',
    ja: '許可されていない外部URLです',
    zh: '不允许的外部URL',
  },
  rate_limited: {
    ko: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요',
    en: 'Too many requests. Please try again later',
    ja: 'リクエストが多すぎます。しばらくしてから再試行してください',
    zh: '请求过多，请稍后再试',
  },
  server_error: {
    ko: '서버 오류가 발생했습니다',
    en: 'Internal server error',
    ja: 'サーバーエラーが発生しました',
    zh: '服务器错误',
  },
}

/** Returns a bilingual error string (ko + lang) for the given key. */
export function errorMsg(key: keyof typeof ERRORS, lang: Lang = 'en'): string {
  const map = ERRORS[key] ?? ERRORS.server_error
  if (lang === 'ko') return map.ko
  return `${map.ko} / ${map[lang] ?? map.en}`
}
