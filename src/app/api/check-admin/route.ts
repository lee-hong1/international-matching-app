import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`check-admin:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ isAdmin: false }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ isAdmin: false }, { status: 401 })
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim()).filter(Boolean)

  const isAdmin = adminEmails.includes(user.email ?? '')
  return NextResponse.json({ isAdmin })
}
