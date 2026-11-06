import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { emailService } from '@/lib/email'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 이메일 구독 취소 링크 조작 방지: HMAC-SHA256 서명 검증
function verifyUnsubToken(email: string, token: string): boolean {
  const secret = process.env.EMAIL_UNSUB_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  if (!secret) return false
  const expected = crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 32)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token.slice(0, 32), 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`unsubscribe:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  try {
    const { email, type, token } = await req.json()

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // 타인 구독 취소 방지: HMAC 토큰 필수 검증
    if (!token || typeof token !== 'string' || !verifyUnsubToken(email, token)) {
      return NextResponse.json({ error: 'Invalid or missing unsubscribe token' }, { status: 403 })
    }

    const VALID_UNSUB_TYPES = ['all', 'marketing', 'booking', 'system']
    const resolvedType = type && VALID_UNSUB_TYPES.includes(type) ? type : 'all'

    // 이메일 존재 여부를 외부에 노출하지 않기 위해 항상 200 반환
    await emailService.unsubscribe(email, resolvedType as Parameters<typeof emailService.unsubscribe>[1]).catch(() => {})

    return NextResponse.json({ message: 'Successfully unsubscribed from emails' })
  } catch {
    return NextResponse.json({ error: 'Failed to process unsubscribe request' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`unsubscribe:${ip}`, 'general')
  if (!rl.allowed) {
    return NextResponse.redirect(new URL('/unsubscribed?success=false', req.url))
  }

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const rawType = searchParams.get('type') || 'all'
  const VALID_UNSUB_TYPES_GET = ['all', 'marketing', 'booking', 'system']
  const type = VALID_UNSUB_TYPES_GET.includes(rawType) ? rawType : 'all'

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
  }

  // 타인 구독 취소 방지: 이메일 발송 시 생성한 HMAC 토큰 검증
  const token = searchParams.get('token') ?? ''
  if (!verifyUnsubToken(email, token)) {
    return NextResponse.redirect(new URL('/unsubscribed?success=false', req.url))
  }

  try {
    await emailService.unsubscribe(email, type as Parameters<typeof emailService.unsubscribe>[1])
    return NextResponse.redirect(new URL('/unsubscribed?success=true', req.url))
  } catch {
    return NextResponse.redirect(new URL('/unsubscribed?success=false', req.url))
  }
}
