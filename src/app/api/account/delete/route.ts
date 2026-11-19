import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

/**
 * DELETE /api/account/delete
 * GDPR Article 17 — Right to Erasure.
 * 1) Stripe 구독 취소
 * 2) Storage 파일 삭제 (avatars, posts, stories)
 * 3) auth.admin.deleteUser → profiles 등 cascade 삭제
 * 개인정보는 로그에 절대 출력하지 않음.
 */
export async function DELETE(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`account-delete:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // ── 인증 ──────────────────────────────────────────────────────────────────
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ── 0. 활성 예약 차단 ─────────────────────────────────────────────────────
  // pending/confirmed 예약이 있으면 삭제 불가.
  // cascade 삭제 시 환불 없이 예약 기록이 소멸되는 것을 방지.
  const { count: activeBookingCount } = await supabaseService
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .or(`guest_id.eq.${user.id},host_id.eq.${user.id}`)
    .in('status', ['pending', 'confirmed'])

  if ((activeBookingCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'You have active bookings. Please cancel or complete all bookings before deleting your account.' },
      { status: 409 }
    )
  }

  // ── 1. Stripe 구독 취소 ───────────────────────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (stripeKey) {
    try {
      const { data: activeSubs } = await supabaseService
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (activeSubs?.length) {
        const { default: Stripe } = await import('stripe')
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-07-30.basil' })
        await Promise.all(
          activeSubs.map((s) =>
            s.stripe_subscription_id
              ? stripe.subscriptions.cancel(s.stripe_subscription_id).catch((e: Error) => {
                  console.error('[account/delete] stripe cancel error:', e.message)
                })
              : Promise.resolve()
          )
        )
      }
    } catch (e) {
      // Stripe 취소 실패해도 계정 삭제 진행 (운영팀이 수동으로 취소)
      console.error('[account/delete] stripe lookup error:', (e as Error).message)
    }
  }

  // ── 2. Storage 파일 삭제 ──────────────────────────────────────────────────
  // GDPR Article 17: 모든 파일을 삭제해야 하므로 1000개 초과 시 페이지네이션 필요
  const STORAGE_BUCKETS = ['avatars', 'posts', 'stories']
  const PAGE_SIZE = 1000
  for (const bucket of STORAGE_BUCKETS) {
    try {
      let offset = 0
      while (true) {
        const { data: files } = await supabaseService.storage
          .from(bucket)
          .list(user.id, { limit: PAGE_SIZE, offset })

        if (!files?.length) break

        await supabaseService.storage
          .from(bucket)
          .remove(files.map((f) => `${user.id}/${f.name}`))

        if (files.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      }
    } catch (e) {
      // 파일 삭제 실패해도 계정 삭제 진행 (오브젝트만 남음)
      console.error('[account/delete] storage cleanup error:', (e as Error).message)
    }
  }

  // ── 3. Auth 삭제 (profiles 등 cascade) ────────────────────────────────────
  const { error } = await supabaseService.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[account/delete] auth.admin.deleteUser error:', error.message)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
