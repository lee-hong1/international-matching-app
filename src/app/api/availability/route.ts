import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * GET /api/availability?host_id=xxx
 * 호스트 가용 시간 조회 (인증 사용자 접근 가능).
 */
export async function GET(req: NextRequest) {
  const getIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const getRl = await checkRateLimit(`availability-get:${getIp}`, 'general')
  if (!getRl.allowed) {
    const r = rateLimitResponse(getRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const url = new URL(req.url)
  const hostId = url.searchParams.get('host_id')

  if (!hostId || !isValidUuid(hostId)) {
    return NextResponse.json({ error: 'Valid host_id required' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('host_availability')
    .select('id, day_of_week, start_time, end_time, timezone, is_active')
    .eq('host_id', hostId)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }

  return NextResponse.json({ availability: data })
}

/**
 * POST /api/availability
 * 가용 시간 등록 (JWT host_id — IDOR 방지).
 * body: { day_of_week: 0-6, start_time: "HH:MM", end_time: "HH:MM", timezone: string }
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(ip, 'general')
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { day_of_week, start_time, end_time, timezone } = body as Record<string, unknown>

  if (
    typeof day_of_week !== 'number' ||
    !Number.isInteger(day_of_week) ||
    day_of_week < 0 ||
    day_of_week > 6
  ) {
    return NextResponse.json({ error: 'day_of_week must be integer 0-6' }, { status: 400 })
  }
  if (typeof start_time !== 'string' || !TIME_RE.test(start_time)) {
    return NextResponse.json({ error: 'start_time must be HH:MM format' }, { status: 400 })
  }
  if (typeof end_time !== 'string' || !TIME_RE.test(end_time)) {
    return NextResponse.json({ error: 'end_time must be HH:MM format' }, { status: 400 })
  }
  if (end_time <= start_time) {
    return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 })
  }
  if (typeof timezone !== 'string' || !isValidTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }

  // 최대 20개 슬롯 제한
  const { count } = await supabaseService
    .from('host_availability')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', user.id)
    .eq('is_active', true)

  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: 'Maximum 20 availability slots allowed' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('host_availability')
    .insert({
      host_id: user.id,
      day_of_week,
      start_time,
      end_time,
      timezone,
    })
    .select('id, day_of_week, start_time, end_time, timezone')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Availability slot already exists for this time' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create availability slot' }, { status: 500 })
  }

  return NextResponse.json({ availability: data }, { status: 201 })
}
