import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isValidUuid } from '@/lib/commerce'
import { timingSafeEqual, createHash } from 'crypto'

/**
 * PATCH /api/admin/profiles/:id/suspend
 * 관리자 계정 정지/해제. x-admin-key 헤더 인증 (타이밍 어택 방지).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Admin key 인증 (타이밍 어택 방지) ───────────────────────────────────
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 500 })
  }
  const provided = req.headers.get('x-admin-key') ?? ''
  let authorized = false
  try {
    const a = Buffer.from(adminKey)
    const b = Buffer.from(provided)
    authorized = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    authorized = false
  }
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 대상 사용자 UUID 검증 ─────────────────────────────────────────────
  const { id } = params
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
