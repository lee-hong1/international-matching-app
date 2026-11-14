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
import { isSuspended } from '@src/lib/suspended-check'

const MIN_AGE_YEARS = 19

// DB 트리거(birth_date + INTERVAL '19 years' <= CURRENT_DATE)와 동일한 계산 방식
// ms 기반 계산(365.25 * 19)은 윤년 오차로 DB 결과와 불일치 가능 → setFullYear 사용
function isAdult(birthDate: string): boolean {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return false
  const adultDate = new Date(birth)
  adultDate.setFullYear(adultDate.getFullYear() + MIN_AGE_YEARS)
  return adultDate <= new Date()
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

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
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

  // 유효한 날짜 범위 체크 (99월 등 Invalid Date 방지)
  const parsedBirth = new Date(birth_date)
  if (isNaN(parsedBirth.getTime())) {
    return NextResponse.json({ error: 'birth_date is not a valid date' }, { status: 400 })
  }

  // 미래 날짜 차단
  if (parsedBirth >= new Date()) {
    return NextResponse.json({ error: 'Invalid birth date' }, { status: 400 })
  }

  // 최대 나이 제한 (150세) — 비정상 날짜 차단
  const MAX_AGE_MS = 150 * 365.25 * 24 * 60 * 60 * 1000
  if (Date.now() - parsedBirth.getTime() > MAX_AGE_MS) {
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

  // birth_date 저장 — is_adult는 DB 트리거(compute_is_adult)가 자동 계산
  const { error: updateErr } = await supabaseService
    .from('profiles')
    .update({ birth_date })
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Age verification failed' }, { status: 500 })
  }

  // DB 트리거가 없을 경우를 대비: is_adult를 명시적으로도 업데이트
  await supabaseService
    .from('profiles')
    .update({ is_adult: true })
    .eq('id', user.id)

  // JWT app_metadata 업데이트 — 미들웨어 fast-path 체크 활성화
  // DB 조회 없이 JWT 클레임만으로 is_adult 확인 가능 (성능 최적화)
  await supabaseService.auth.admin.updateUserById(user.id, {
    app_metadata: { is_adult: true },
  }).catch(() => null) // 실패해도 프로필 업데이트는 완료된 상태

  // 통과 로그 (생년월일 비저장)
  await supabaseService
    .from('age_verification_logs')
    .insert({ result: 'passed', user_id: user.id })

  return NextResponse.json({ verified: true, message: 'Age verification completed' }, { status: 200 })
}
