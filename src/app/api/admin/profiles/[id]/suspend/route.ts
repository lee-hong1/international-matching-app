import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isValidUuid, getAuthUser } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { timingSafeEqual, createHash } from 'crypto'

/**
 * PATCH /api/admin/profiles/:id/suspend
 * 관리자 계정 정지/해제.
 * 인증 방법 (둘 중 하나):
 *   A. x-admin-key 헤더 (서버 간 호출, timingSafeEqual 검증)
 *   B. JWT Bearer 토큰 (브라우저 관리자 UI, ADMIN_EMAILS 서버사이드 env var 체크)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Rate limit — admin key brute-force 방지 ────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`admin-suspend:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 인증: x-admin-key 또는 JWT + ADMIN_EMAILS ──────────────────────────
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

  // ── 대상 사용자 UUID 검증 ─────────────────────────────────────────────
  const { id } = await params
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  // ── 요청 파싱 ──────────────────────────────────────────────────────────
  let body: { action: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body
  if (!['suspend', 'unsuspend'].includes(action)) {
    return NextResponse.json({ error: 'action must be "suspend" or "unsuspend"' }, { status: 400 })
  }
  if (body.reason !== undefined && body.reason !== null) {
    if (typeof body.reason !== 'string' || body.reason.length > 1000) {
      return NextResponse.json({ error: 'reason must be a string under 1000 characters' }, { status: 400 })
    }
  }

  // ── 프로필 존재 확인 ────────────────────────────────────────────────────
  const { data: existing, error: fetchErr } = await supabaseService
    .from('profiles')
    .select('id, is_suspended')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // ── 정지 / 해제 ─────────────────────────────────────────────────────────
  const updates =
    action === 'suspend'
      ? { is_suspended: true }
      : { is_suspended: false, violation_count: 0 }

  const { error: updateErr } = await supabaseService
    .from('profiles')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    console.error('[admin suspend] update error:', updateErr.code)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  // JWT app_metadata에 is_suspended 반영 → 미들웨어에서 DB 조회 없이 체크 가능
  // (최대 JWT 만료 1시간 지연 허용, DB는 즉시 반영)
  const { error: authUpdateErr } = await supabaseService.auth.admin.updateUserById(id, {
    app_metadata: { is_suspended: action === 'suspend' },
  })
  if (authUpdateErr) {
    // app_metadata 업데이트 실패는 치명적이지 않음 (DB가 최종 방어선)
    console.error('[admin suspend] app_metadata update error:', authUpdateErr.message)
  }

  // 감사 로그 기록 (fire-and-forget — 로그 실패가 응답에 영향 없음)
  void (async () => {
    try {
      const adminKeyHash = createHash('sha256').update(adminKey).digest('hex').substring(0, 16)
      await supabaseService.from('admin_actions').insert({
        admin_key_hash: adminKeyHash,
        target_user_id: id,
        action,
        reason: body.reason ?? null,
      })
    } catch (e) {
      console.error('[admin suspend] audit log error:', (e as Error).message)
    }
  })()

  return NextResponse.json({ success: true, action, userId: id })
}
