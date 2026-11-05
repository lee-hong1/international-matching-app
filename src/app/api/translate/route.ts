import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser } from '@src/lib/commerce'

const SUPPORTED_LANGS = new Set(['ko', 'en', 'zh', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'ru', 'th', 'vi', 'id'])

// POST /api/translate — 서버 사이드 번역 프록시
// GOOGLE_TRANSLATE_API_KEY (서버 전용, NEXT_PUBLIC_ 아님)를 사용하여 클라이언트 노출 방지
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`translate:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // 인증 필수 — 비회원 번역 요청 차단 (비용 절감)
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Translation service not configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { text, targetLanguage, sourceLanguage } = body

  if (typeof text !== 'string' || text.trim().length === 0 || text.length > 5000) {
    return NextResponse.json({ error: 'text must be 1–5000 characters' }, { status: 400 })
  }
  if (!targetLanguage || !SUPPORTED_LANGS.has(targetLanguage)) {
    return NextResponse.json({ error: 'Unsupported targetLanguage' }, { status: 400 })
  }
  if (sourceLanguage && !SUPPORTED_LANGS.has(sourceLanguage)) {
    return NextResponse.json({ error: 'Unsupported sourceLanguage' }, { status: 400 })
  }

  const params = new URLSearchParams({
    q: text,
    target: targetLanguage,
    key: apiKey,
    format: 'text',
  })
  if (sourceLanguage) params.set('source', sourceLanguage)

  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Translation service error' }, { status: 502 })
  }

  const data = await res.json()
  const translation = data?.data?.translations?.[0]

  return NextResponse.json({
    translatedText: translation?.translatedText ?? '',
    detectedSourceLanguage: translation?.detectedSourceLanguage ?? sourceLanguage ?? null,
  })
}
