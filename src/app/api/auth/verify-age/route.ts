/**
 * POST /api/auth/verify-age
 *
 * 가입 온보딩 필수 단계 — 만 19세 미만 차단 (청소년보호법).
 * - 생년월일 로그 출력 절대 금지
 * - 프로필 업데이트 후 is_adult 컬럼 자동 갱신 (GENERATED ALWAYS)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, getAuthUser } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

const MIN_AGE_YEARS = 19
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

function isAdult(birthDate: string): boolean {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return false
  const ageMs = Date.now() - birth.getTime()
  return ageMs >= MIN_AGE_YEARS * MS_PER_YEAR
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await checkRateLimit(`verify-age:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let birth_date: string
  try {
    const body = await req.json()
    birth_date = body.birth_date
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!birth_date || !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
    return NextResponse.json({ error: 'birth_date format: YYYY-MM-DD' }, { status: 400 })
  }

  // 미래 날짜 차단
  if (new Date(birth_date) >= new Date()) {
    return NextResponse.json({ error: 'Invalid birth date' }, { status: 400 })
  }

  if (!isAdult(birth_date)) {
    // 차단 로그 (생년월일 비저장)
    await supabaseService
      .from('age_verification_logs')
      .insert({ result: 'blocked', user_id: user.id })

    return NextResponse.json(
      { error: 'Users under 19 are not permitted' },
      { status: 403 }
    )
  }

  // birth_date 저장 — is_adult는 DB GENERATED ALWAYS로 자동 계산
  const { error: updateErr } = await supabaseService
    .from('profiles')
    .update({ birth_date })
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Age verification failed' }, { status: 500 })
  }

  // 통과 로그 (생년월일 비저장)
  await supabaseService
    .from('age_verification_logs')
    .insert({ result: 'passed', user_id: user.id })

  return NextResponse.json({ verified: true, message: 'Age verification completed' }, { status: 200 })
}
