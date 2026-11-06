import { NextRequest, NextResponse } from 'next/server'
import { isValidUuid } from '@src/lib/commerce'
import { t, normalizeLang, type Lang } from '@src/lib/i18n'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

type NotificationType = 'new_booking' | 'confirmed' | 'cancelled'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

interface EmailPayload {
  to_email: string
  type: NotificationType
  booking_id: string
  lang?: string
  vars?: Record<string, string>
}

function buildEmailHtml(type: NotificationType, lang: Lang, vars: Record<string, string>): string {
  const safeVars = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, escapeHtml(v)]))
  const title = t(`notification.${type}.title`, lang)
  const body = t(`notification.${type}.body`, lang, safeVars)
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#e91e63">${escapeHtml(title)}</h2>
  <p style="font-size:16px;color:#333">${body}</p>
  <p style="font-size:12px;color:#999;margin-top:32px">GlobalMatch · booking #${escapeHtml(vars.booking_id ?? '')}</p>
</body>
</html>`
}

/**
 * POST /api/emails/booking-notification
 * 내부 호출 전용 (SUPABASE_SERVICE_ROLE_KEY 헤더 검증).
 * 개인정보(이메일)는 로그에 출력하지 않는다.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`booking-notification-email:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // 내부 호출 인증 — service role key 헤더
  const authHeader = req.headers.get('x-service-key')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || authHeader !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: EmailPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { to_email, type, booking_id, lang: langRaw = 'ko', vars = {} } = body
  const lang = normalizeLang(langRaw)

  if (!to_email || typeof to_email !== 'string') {
    return NextResponse.json({ error: 'to_email required' }, { status: 400 })
  }
  if (!['new_booking', 'confirmed', 'cancelled'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (!booking_id || !isValidUuid(booking_id)) {
    return NextResponse.json({ error: 'Valid booking_id required' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // 환경변수 미설정 시 graceful skip (개발 환경)
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured' })
  }

  const html = buildEmailHtml(type, lang, { ...vars, booking_id })
  const subject = t(`notification.${type}.title`, lang)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GlobalMatch <noreply@globalmatch.app>',
        to: [to_email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      // 실패해도 200 반환 (fire-and-forget)
      return NextResponse.json({ sent: false, reason: 'resend_error' })
    }
  } catch {
    return NextResponse.json({ sent: false, reason: 'network_error' })
  }

  return NextResponse.json({ sent: true })
}
