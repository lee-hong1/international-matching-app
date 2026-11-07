import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isValidUuid, getAuthUser } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { timingSafeEqual } from 'crypto'

/**
 * PATCH /api/admin/reports/:id
 * 신고 처리 (resolve / dismiss).
 * 인증: x-admin-key 또는 JWT + ADMIN_EMAILS
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`admin-report:${ip}`, 'general')
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
    return NextResponse.json({ error: 'Invalid report id' }, { status: 400 })
  }

  let body: { action: string; admin_note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, admin_note } = body
  if (!['resolve', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'action must be "resolve" or "dismiss"' }, { status: 400 })
  }
  if (admin_note !== undefined && admin_note !== null) {
    if (typeof admin_note !== 'string' || admin_note.length > 2000) {
      return NextResponse.json({ error: 'admin_note must be a string under 2000 characters' }, { status: 400 })
    }
  }

  const { data: existing, error: fetchErr } = await supabaseService
    .from('reports').select('id').eq('id', id).single()
  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const { error: updateErr } = await supabaseService
    .from('reports')
    .update({
      status: action === 'resolve' ? 'resolved' : 'dismissed',
      resolved_at: new Date().toISOString(),
      ...(admin_note ? { admin_note } : {}),
    })
    .eq('id', id)

  if (updateErr) {
    console.error('[admin reports] update error:', updateErr.code)
    return NextResponse.json({ error: 'Failed to handle report' }, { status: 500 })
  }

  return NextResponse.json({ success: true, reportId: id, action })
}
