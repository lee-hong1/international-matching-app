import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isValidUuid, getAuthUser } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { timingSafeEqual } from 'crypto'

/**
 * PATCH /api/admin/profiles/:id/verify
 * 사용자 인증 상태 변경 (verified / rejected).
 * 인증: x-admin-key 또는 JWT + ADMIN_EMAILS
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`admin-verify:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  let authorized = false
  const adminKey = process.env.ADMIN_API_KEY
  const providedKey = req.headers.get('x-admin-key')
  if (adminKey && providedKey) {
    try {
      const a = Buffer.from(adminKey)
      const b = Buffer.from(providedKey)
      authorized = a.length === b.length && timingSafeEqual(a, b)
    } catch {
      authorized = false
    }
  }
  if (!authorized) {
    const user = await getAuthUser(req)
    if (user?.email) {
      const adminEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
      authorized = adminEmails.length > 0 && adminEmails.includes(user.email.toLowerCase())
    }
  }
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  let body: { status: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { status } = body
  if (!['verified', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be "verified" or "rejected"' }, { status: 400 })
  }

  const { data: existing, error: fetchErr } = await supabaseService
    .from('profiles').select('id').eq('id', id).single()
  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error: updateErr } = await supabaseService
    .from('profiles')
    .update({ verification_status: status })
    .eq('id', id)

  if (updateErr) {
    console.error('[admin verify] update error:', updateErr.code)
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: id, status })
}
