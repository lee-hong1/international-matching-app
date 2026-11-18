import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

// 채팅 번역 지원 언어 (Papago 최적: ko/ja/zh, 나머지 Google Translate)
const CHAT_SUPPORTED_LANGS = new Set([
  'ko', 'en', 'zh', 'ja', 'vi', 'th', 'es', 'id', 'pt',
  'fr', 'de', 'ar', 'ru', 'it',
])

// Papago API가 지원하는 언어 쌍 (한/중/일 최적)
const PAPAGO_PAIRS: Set<string> = new Set([
  'ko-en', 'ko-ja', 'ko-zh-CN', 'ko-zh-TW', 'ko-vi', 'ko-th', 'ko-id',
  'ko-fr', 'ko-de', 'ko-es', 'ko-ru', 'ko-pt', 'ko-it',
  'en-ko', 'ja-ko', 'zh-CN-ko', 'zh-TW-ko', 'vi-ko', 'th-ko', 'id-ko',
  'ja-en', 'en-ja', 'zh-CN-en', 'zh-TW-en',
])

function toPapagoLang(lang: string): string {
  if (lang === 'zh') return 'zh-CN'
  return lang
}

function isPapagoAvailable(source: string, target: string): boolean {
  const s = toPapagoLang(source)
  const t = toPapagoLang(target)
  return PAPAGO_PAIRS.has(`${s}-${t}`)
}

async function translateWithPapago(
  text: string, source: string, target: string,
  clientId: string, clientSecret: string
): Promise<string> {
  const params = new URLSearchParams({
    source: toPapagoLang(source),
    target: toPapagoLang(target),
    text,
  })
  const res = await fetch('https://naveropenapi.apigw.ntruss.com/nmt/v1/translation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-NCP-APIGW-API-KEY-ID': clientId,
      'X-NCP-APIGW-API-KEY': clientSecret,
    },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`Papago error: ${res.status}`)
  const data = await res.json()
  return data?.message?.result?.translatedText ?? ''
}

async function translateWithGoogle(
  text: string, source: string | null, target: string, apiKey: string
): Promise<{ text: string; detected?: string }> {
  const params = new URLSearchParams({ q: text, target, key: apiKey, format: 'text' })
  if (source) params.set('source', source)
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?${params}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`Google Translate error: ${res.status}`)
  const data = await res.json()
  const tr = data?.data?.translations?.[0]
  return { text: tr?.translatedText ?? '', detected: tr?.detectedSourceLanguage }
}

/**
 * POST /api/chat/translate
 * 채팅 메시지 번역. Papago 우선(ko/ja/zh 조합), 나머지 Google Translate 폴백.
 * - message_id: 번역할 메시지 ID (UUID) — 소유권 확인 없이 room 멤버십만 확인
 * - target_lang: 대상 언어 코드
 * - text: 번역할 텍스트 (최대 2000자)
 * - room_id: 채팅룸 ID (멤버십 확인용)
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`chat-translate:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  let body: { text: string; target_lang: string; source_lang?: string; room_id: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, target_lang, source_lang, room_id } = body

  if (typeof text !== 'string' || text.trim().length === 0 || text.length > 2000) {
    return NextResponse.json({ error: 'text must be 1–2000 characters' }, { status: 400 })
  }
  if (!target_lang || !CHAT_SUPPORTED_LANGS.has(target_lang)) {
    return NextResponse.json({ error: `Unsupported target_lang: ${target_lang}` }, { status: 400 })
  }
  if (source_lang && !CHAT_SUPPORTED_LANGS.has(source_lang)) {
    return NextResponse.json({ error: `Unsupported source_lang: ${source_lang}` }, { status: 400 })
  }
  if (!room_id || !isValidUuid(room_id)) {
    return NextResponse.json({ error: 'Invalid room_id' }, { status: 400 })
  }

  // 채팅룸 멤버십 확인 (IDOR 방지 — 본인이 속한 룸의 메시지만 번역 가능)
  const { data: membership, error: memberErr } = await supabaseService
    .from('chat_room_members')
    .select('id')
    .eq('room_id', room_id)
    .eq('user_id', user.id)
    .single()

  if (memberErr || !membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // 번역 실행 (Papago 우선 → Google Translate 폴백)
  const papagoClientId = process.env.PAPAGO_CLIENT_ID
  const papagoClientSecret = process.env.PAPAGO_CLIENT_SECRET
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY

  if (!papagoClientId && !googleApiKey) {
    return NextResponse.json({ error: 'Translation service not configured' }, { status: 503 })
  }

  let translatedText = ''
  let detectedSourceLang: string | null = source_lang ?? null
  let provider = 'none'

  try {
    if (
      papagoClientId && papagoClientSecret &&
      source_lang && isPapagoAvailable(source_lang, target_lang)
    ) {
      translatedText = await translateWithPapago(text, source_lang, target_lang, papagoClientId, papagoClientSecret)
      provider = 'papago'
    } else if (googleApiKey) {
      const result = await translateWithGoogle(text, source_lang ?? null, target_lang, googleApiKey)
      translatedText = result.text
      detectedSourceLang = result.detected ?? detectedSourceLang
      provider = 'google'
    } else if (papagoClientId && papagoClientSecret && source_lang) {
      translatedText = await translateWithPapago(text, source_lang, target_lang, papagoClientId, papagoClientSecret)
      provider = 'papago'
    } else {
      return NextResponse.json({ error: 'No suitable translation provider available' }, { status: 503 })
    }
  } catch {
    // Papago 실패 시 Google로 폴백
    if (provider === 'none' && googleApiKey) {
      try {
        const result = await translateWithGoogle(text, source_lang ?? null, target_lang, googleApiKey)
        translatedText = result.text
        detectedSourceLang = result.detected ?? detectedSourceLang
        provider = 'google-fallback'
      } catch {
        return NextResponse.json({ error: 'Translation failed' }, { status: 502 })
      }
    } else {
      return NextResponse.json({ error: 'Translation failed' }, { status: 502 })
    }
  }

  return NextResponse.json({
    translatedText,
    sourceLang: detectedSourceLang,
    targetLang: target_lang,
    provider,
  })
}
