import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`unsubscribe:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  try {
    const { email, type } = await req.json()

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
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
  const type = searchParams.get('type') || 'all'

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
  }

  try {
    await emailService.unsubscribe(email, type as Parameters<typeof emailService.unsubscribe>[1])
    return NextResponse.redirect(new URL('/unsubscribed?success=true', req.url))
  } catch {
    return NextResponse.redirect(new URL('/unsubscribed?success=false', req.url))
  }
}
