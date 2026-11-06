import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { isValidUuid, getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2025-07-30.basil',
})

// GET /api/profiles/:id — 공개 프로필 (email/birth_date 미포함)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // anon 스크래핑 방지 — graceful fallback (rate limit 실패해도 응답 반환)
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const rl = await checkRateLimit(`profiles-id-get:${ip}`, 'general')
    if (!rl.allowed) {
      const { body, headers, status } = rateLimitResponse(rl.resetAt)
      return NextResponse.json(body, { status, headers })
    }
  } catch {
    // rate limit 인프라 오류 시 요청 허용
  }

  const { id } = await params

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('public_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// DELETE /api/profiles/:id — GDPR Right-to-Erasure (본인만)
// Supabase Auth 계정 삭제 → cascade로 모든 프로필/콘텐츠 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // GDPR 삭제는 rate limit 엄격 적용 (악용 방지)
  const delIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const delRl = await checkRateLimit(`profiles-id-delete:${delIp}`, 'payment')
  if (!delRl.allowed) {
    const { body, headers, status } = rateLimitResponse(delRl.resetAt)
    return NextResponse.json(body, { status, headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 })
  }

  // 본인 계정만 삭제 가능 (IDOR 방지)
  if (user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Storage 파일 삭제 — GDPR Art.17 준수 (auth 삭제 전 처리)
  // avatars 버킷: 경로 패턴 `{userId}/avatar.*` 또는 `avatar_{userId}.*`
  try {
    const { data: avatarFiles } = await supabaseService.storage
      .from('avatars')
      .list(id)
    if (avatarFiles && avatarFiles.length > 0) {
      await supabaseService.storage
        .from('avatars')
        .remove(avatarFiles.map((f) => `${id}/${f.name}`))
    }
    // 루트에 직접 업로드된 경우도 커버
    const { data: rootFiles } = await supabaseService.storage
      .from('avatars')
      .list('', { search: id })
    if (rootFiles && rootFiles.length > 0) {
      await supabaseService.storage
        .from('avatars')
        .remove(rootFiles.map((f) => f.name))
    }
  } catch {
    // storage 삭제 실패는 계정 삭제를 막지 않음 (best-effort)
  }

  // Stripe 구독 취소 — 계정 삭제 전 과금 중단 (GDPR + 소비자보호법)
  try {
    const { data: activeSubs } = await supabaseService
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', id)
      .eq('status', 'active')
      .not('stripe_subscription_id', 'is', null)

    if (activeSubs && activeSubs.length > 0) {
      await Promise.all(
        activeSubs.map(async (sub) => {
          if (sub.stripe_subscription_id) {
            try {
              await stripe.subscriptions.cancel(sub.stripe_subscription_id)
            } catch (e) {
              console.error('[profiles DELETE] stripe cancel failed:', (e as Error).message)
            }
          }
        })
      )
    }
  } catch {
    // 구독 취소 실패는 계정 삭제를 막지 않음 (best-effort)
  }

  // 미확정/확정 예약 취소 (호스트에게 cascade 알림은 webhook에서 처리)
  try {
    await supabaseService
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('guest_id', id)
      .in('status', ['pending', 'confirmed'])
  } catch {
    // best-effort
  }

  // Supabase auth.admin.deleteUser는 연결된 profiles row를 cascade 삭제
  const { error } = await supabaseService.auth.admin.deleteUser(id)
  if (error) {
    console.error('[profiles DELETE] auth.admin.deleteUser failed:', id.substring(0, 8) + '...')
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Account and all associated data deleted' }, { status: 200 })
}
