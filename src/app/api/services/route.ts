import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { hasForbiddenContent } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'
import { detectExternalPlatform } from '@src/lib/chat-safety'

const VALID_CATEGORIES = ['conversation', 'lesson', 'tour', 'meal', 'activity', 'other'] as const
type ServiceCategory = typeof VALID_CATEGORIES[number]

const VALID_CURRENCIES = ['KRW', 'JPY', 'CNY', 'USD'] as const

/**
 * GET /api/services?host_id=xxx
 * 호스트의 활성 서비스 목록 조회 (인증 불필요).
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`services-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const url = new URL(req.url)
  const hostId = url.searchParams.get('host_id')
  const category = url.searchParams.get('category') as ServiceCategory | null
  const rawLimit = parseInt(url.searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 100)

  if (hostId && !isValidUuid(hostId)) {
    return NextResponse.json({ error: 'Invalid host_id' }, { status: 400 })
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  let query = supabaseService
    .from('services')
    .select('id, host_id, title, description, duration_minutes, price, currency, category, max_bookings_per_day, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (hostId) query = query.eq('host_id', hostId)
  if (category) query = query.eq('category', category)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/**
 * POST /api/services
 * 서비스 생성. JWT에서 host_id 추출 (IDOR 방지).
 */
export async function POST(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`services-post:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // ── 입력 파싱 ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, description, duration_minutes, price, currency, category, max_bookings_per_day } = body

  // ── 유효성 검사 ───────────────────────────────────────────────────────────
  if (typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) {
    return NextResponse.json({ error: 'title must be 2–100 characters' }, { status: 400 })
  }
  if (typeof duration_minutes !== 'number' || !Number.isFinite(duration_minutes) || duration_minutes <= 0 || duration_minutes > 480) {
    return NextResponse.json({ error: 'duration_minutes must be 1–480' }, { status: 400 })
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'price must be >= 0' }, { status: 400 })
  }
  if (currency !== undefined && !VALID_CURRENCIES.includes(currency as typeof VALID_CURRENCIES[number])) {
    return NextResponse.json({ error: `currency must be one of: ${VALID_CURRENCIES.join(', ')}` }, { status: 400 })
  }
  if (!VALID_CATEGORIES.includes(category as ServiceCategory)) {
    return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 2000) {
      return NextResponse.json({ error: 'description must be under 2000 characters' }, { status: 400 })
    }
  }
  if (max_bookings_per_day !== undefined && max_bookings_per_day !== null) {
    if (!Number.isInteger(max_bookings_per_day) || (max_bookings_per_day as number) < 1 || (max_bookings_per_day as number) > 100) {
      return NextResponse.json({ error: 'max_bookings_per_day must be an integer between 1 and 100' }, { status: 400 })
    }
  }

  // ── 금지 콘텐츠 필터 ──────────────────────────────────────────────────────
  const titleStr = (title as string).trim()
  const descStr = typeof description === 'string' ? description.trim() : ''
  if (hasForbiddenContent(titleStr) || hasForbiddenContent(descStr)) {
    return NextResponse.json({ error: 'Content contains prohibited keywords' }, { status: 400 })
  }
  if (detectExternalPlatform(titleStr) || detectExternalPlatform(descStr)) {
    return NextResponse.json({ error: 'External platform referral not allowed' }, { status: 400 })
  }

  // ── host 프로필 확인 (is_adult) ───────────────────────────────────────────
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('is_adult')
    .eq('id', user.id)
    .single()
  if (!profile?.is_adult) {
    return NextResponse.json({ error: 'Age verification required to create services' }, { status: 403 })
  }

  // ── 서비스 수 제한 (호스트당 최대 50개) ───────────────────────────────────
  const { count } = await supabaseService
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', user.id)
    .eq('is_active', true)
  if ((count ?? 0) >= 50) {
    return NextResponse.json({ error: 'Maximum 50 active services per host' }, { status: 400 })
  }

  // ── 약관 동의 확인 (결혼중개업법 §13 계약서 교부 의무) ─────────────────────
  const termsAgreed = body.terms_agreed === true
  if (!termsAgreed) {
    return NextResponse.json({ error: 'Host terms agreement required (terms_agreed: true)' }, { status: 400 })
  }

  // ── INSERT ────────────────────────────────────────────────────────────────
  const { data: service, error } = await supabaseService
    .from('services')
    .insert({
      host_id: user.id,
      title: titleStr,
      description: descStr || null,
      duration_minutes,
      price,
      currency: currency ?? 'KRW',
      category,
      max_bookings_per_day: max_bookings_per_day ?? null,
    })
    .select('id, title, category, price, currency, duration_minutes, is_active, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }

  // ── 약관 동의 타임스탬프 기록 (최초 동의 시에만 업데이트) ─────────────────
  void supabaseService
    .from('profiles')
    .update({ host_terms_agreed_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('host_terms_agreed_at', null)

  return NextResponse.json({ data: service }, { status: 201 })
}
