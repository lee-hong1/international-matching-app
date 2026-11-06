import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isSuspended } from '@src/lib/suspended-check'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2025-07-30.basil' })
}

export async function POST(req: NextRequest) {
  // Rate limit — 결제 세션 생성 (payment 티어: 5/min)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`checkout:${ip}`, 'payment')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // 인증 필수 — userId는 JWT에서 추출 (body의 userId는 무시, IDOR 방지)
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  // 청소년보호법: 결제는 성인 인증 필수
  const { data: agvProfile } = await supabaseService
    .from('profiles')
    .select('is_adult')
    .eq('id', user.id)
    .single()
  if (!agvProfile?.is_adult) {
    return NextResponse.json(
      { error: 'Age verification required', redirect: '/onboarding/verify-age' },
      { status: 403 }
    )
  }

  let stripe: Stripe
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })
  }

  try {
    const { planId } = await req.json()

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }
    if (!isValidUuid(planId)) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
    }

    // 사용자 정보 확인 (service role — 본인 email 조회)
    const { data: profile, error: profileErr } = await supabaseService
      .from('profiles')
      .select('email, display_name')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.email) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 구독 플랜 정보 가져오기
    const { data: plan, error: planError } = await supabaseService
      .from('subscription_plans')
      .select('id, name, price, duration_months')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Stripe 고객 생성 또는 조회
    let customer
    const existingCustomers = await stripe.customers.list({ email: profile.email, limit: 1 })
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: profile.email,
        name: profile.display_name ?? undefined,
        metadata: { userId: user.id },
      })
    }

    // Host 헤더 인젝션 방지: 반드시 환경변수 사용. req.headers.get('host') fallback 금지.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      return NextResponse.json({ error: 'Site URL not configured' }, { status: 503 })
    }

    // 결제 세션 생성 — userId는 JWT 기반 user.id 사용
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'krw',
          product_data: {
            name: plan.name,
            description: `${plan.duration_months}개월 구독`,
          },
          unit_amount: Math.round(Number(plan.price)),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/premium`,
      metadata: { userId: user.id, planId },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error: unknown) {
    console.error('[create-checkout-session] error:', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
