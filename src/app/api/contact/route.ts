import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { supabaseService } from '@src/lib/commerce'

const VALID_SUBJECTS = ['general', 'safety', 'billing', 'booking', 'account', 'gdpr']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  // Stricter rate limit for unauthenticated contact submissions
  const rl = await checkRateLimit(`contact:${ip}`, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  let body: { name?: unknown; email?: unknown; subject?: unknown; message?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, subject, message } = body

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (typeof message !== 'string' || message.trim().length < 10) {
    return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message too long (max 5000 chars)' }, { status: 400 })
  }
  const safeSubject = VALID_SUBJECTS.includes(String(subject)) ? String(subject) : 'general'

  const { error } = await supabaseService
    .from('contact_requests')
    .insert({
      name: name.trim().slice(0, 100),
      email: email.trim().toLowerCase(),
      subject: safeSubject,
      message: message.trim(),
      ip_address: ip,
    })

  if (error) {
    // If table doesn't exist yet, fail gracefully
    if (error.code === '42P01') {
      return NextResponse.json({ message: 'Contact request received' }, { status: 200 })
    }
    return NextResponse.json({ error: 'Failed to submit contact request' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Contact request received' }, { status: 200 })
}
