import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid, hasForbiddenContent } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { detectExternalPlatform } from '@src/lib/chat-safety'

const VALID_CATEGORIES = ['conversation', 'lesson', 'tour', 'meal', 'activity', 'other'] as const
const VALID_CURRENCIES = ['KRW', 'JPY', 'CNY', 'USD'] as const

/**
 * GET /api/services/:id
 * 단건 서비스 조회. 비활성(is_active=false) 서비스는 404 반환 (존재 여부 노출 방지).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(ip, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { id } = await params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid service id' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('services')
    .select('id, host_id, title, description, duration_minutes, price, currency, category, max_bookings_per_day, created_at')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

/**
 * PATCH /api/services/:id
 * 서비스 수정 (부분 업데이트). JWT host_id — IDOR 방지.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(ip, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { id } = await params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid service id' }, { status: 400 })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 소유권 확인 (IDOR 방지)
  const { data: existing, error: fetchErr } = await supabaseService
    .from('services')
    .select('id, host_id')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }
  if (existing.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['title', 'description', 'duration_minutes', 'price', 'currency', 'category', 'is_active', 'max_bookings_per_day']
  const updates: Record<string, unknown> = {}

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // 유효성 검사
  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.length < 2 || updates.title.length > 100) {
      return NextResponse.json({ error: 'title must be 2-100 characters' }, { status: 400 })
    }
    if (hasForbiddenContent(updates.title) || detectExternalPlatform(updates.title)) {
      return NextResponse.json({ error: 'Title contains forbidden content' }, { status: 400 })
    }
  }
  if (updates.description !== undefined && typeof updates.description === 'string') {
    if (hasForbiddenContent(updates.description) || detectExternalPlatform(updates.description)) {
      return NextResponse.json({ error: 'Description contains forbidden content' }, { status: 400 })
    }
  }
  if (updates.category !== undefined && !VALID_CATEGORIES.includes(updates.category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (updates.currency !== undefined && !VALID_CURRENCIES.includes(updates.currency as typeof VALID_CURRENCIES[number])) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }
  if (updates.price !== undefined && (typeof updates.price !== 'number' || updates.price < 0)) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
  }
  if (updates.duration_minutes !== undefined && (typeof updates.duration_minutes !== 'number' || updates.duration_minutes <= 0)) {
    return NextResponse.json({ error: 'duration_minutes must be positive' }, { status: 400 })
  }

  const { data: updated, error } = await supabaseService
    .from('services')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, title, description, price, currency, category, is_active, duration_minutes, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }

  return NextResponse.json({ data: updated })
}

/**
 * DELETE /api/services/:id
 * 서비스 비활성화 (soft delete: is_active=false).
 * 완료되지 않은 예약(pending/confirmed) 있으면 400.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid service id' }, { status: 400 })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 소유권 확인
  const { data: existing, error: fetchErr } = await supabaseService
    .from('services')
    .select('id, host_id, is_active')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }
  if (existing.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 미완료 예약 존재 여부 확인 (기존 예약 보호)
  const { count: activeBookings } = await supabaseService
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', id)
    .in('status', ['pending', 'confirmed'])

  if ((activeBookings ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot deactivate service with active bookings. Cancel them first.' },
      { status: 400 }
    )
  }

  const { error } = await supabaseService
    .from('services')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to deactivate service' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
