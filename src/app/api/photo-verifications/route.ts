import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

/**
 * POST /api/photo-verifications
 * x-service-key 필수 — photo_verifications INSERT는 service_role만 (N+51 RLS).
 * 사진 AI 검증 결과를 서버 측에서 저장.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`photo-verif-post:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const provided = req.headers.get('x-service-key')
  const bufA = Buffer.from(provided ?? '')
  const bufB = Buffer.from(serviceKey)
  if (!provided || bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    user_id: string
    photo_url: string
    is_approved: boolean
    verification_score: number
    rejection_reasons?: unknown
    analysis_data?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, photo_url, is_approved, verification_score, rejection_reasons, analysis_data } = body

  if (!user_id || !isValidUuid(user_id)) {
    return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 })
  }
  if (!photo_url || typeof photo_url !== 'string') {
    return NextResponse.json({ error: 'photo_url required' }, { status: 400 })
  }
  if (typeof is_approved !== 'boolean') {
    return NextResponse.json({ error: 'is_approved must be boolean' }, { status: 400 })
  }
  if (verification_score !== undefined && verification_score !== null) {
    if (typeof verification_score !== 'number' || !Number.isFinite(verification_score) || verification_score < 0 || verification_score > 1) {
      return NextResponse.json({ error: 'verification_score must be a number between 0 and 1' }, { status: 400 })
    }
  }
  if (rejection_reasons !== undefined && rejection_reasons !== null) {
    if (JSON.stringify(rejection_reasons).length > 2000) {
      return NextResponse.json({ error: 'rejection_reasons too large' }, { status: 400 })
    }
  }
  if (analysis_data !== undefined && analysis_data !== null) {
    if (JSON.stringify(analysis_data).length > 10000) {
      return NextResponse.json({ error: 'analysis_data too large' }, { status: 400 })
    }
  }

  const { data, error } = await supabaseService
    .from('photo_verifications')
    .insert({
      user_id,
      photo_url,
      is_approved,
      verification_score: verification_score ?? null,
      rejection_reasons: rejection_reasons ?? null,
      analysis_data: analysis_data ?? null,
      verified_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[photo-verifications POST]', error.code)
    return NextResponse.json({ error: 'Failed to save verification result' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

/**
 * GET /api/photo-verifications — 본인 인증 기록 조회 (JWT 필수)
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`photo-verif:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { data, error } = await supabaseService
    .from('photo_verifications')
    .select('id, photo_url, is_approved, verification_score, rejection_reasons, verified_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[photo-verifications GET]', error.code)
    return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
