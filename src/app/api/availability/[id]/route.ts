import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

/**
 * PATCH /api/availability/:id
 * is_active 토글 (활성화/비활성화).
 * JWT host_id — IDOR 방지.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`availability:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { id } = await params

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid availability id' }, { status: 400 })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: { is_active?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active (boolean) required' }, { status: 400 })
  }

  const { data: slot, error: fetchErr } = await supabaseService
    .from('host_availability')
    .select('id, host_id')
    .eq('id', id)
    .single()

  if (fetchErr || !slot) {
    return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 })
  }
  if (slot.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: updated, error } = await supabaseService
    .from('host_availability')
    .update({ is_active: body.is_active })
    .eq('id', id)
    .select('id, is_active')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update availability slot' }, { status: 500 })
  }

  return NextResponse.json(updated)
}

/**
 * DELETE /api/availability/:id
 * 가용 시간 슬롯 삭제 (soft: is_active=false).
 * JWT host_id — IDOR 방지.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const delIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const delRl = await checkRateLimit(`availability-delete:${delIp}`, 'general')
  if (!delRl.allowed) {
    const r = rateLimitResponse(delRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { id } = await params

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid availability id' }, { status: 400 })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 소유권 확인 (IDOR 방지)
  const { data: slot, error: fetchErr } = await supabaseService
    .from('host_availability')
    .select('id, host_id')
    .eq('id', id)
    .single()

  if (fetchErr || !slot) {
    return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 })
  }
  if (slot.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseService
    .from('host_availability')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete availability slot' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
