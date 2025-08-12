import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 이벤트 처리
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.userId
    const planId = session.metadata?.planId

    if (!userId || !planId) {
      console.error('Missing metadata in checkout session')
      return
    }

    // 구독 플랜 정보 가져오기
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (!plan) {
      console.error('Plan not found:', planId)
      return
    }

    // 구독 종료 날짜 계산
    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + plan.duration_months)

    // 사용자 구독 정보 생성
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        payment_id: session.payment_intent as string
      })

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      return
    }

    // 결제 내역 저장
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount: session.amount_total! / 100, // cents를 원화로 변환
        currency: 'KRW',
        payment_method: 'stripe',
        payment_status: 'completed',
        payment_provider: 'stripe',
        provider_payment_id: session.payment_intent as string,
        description: `${plan.name} 구독 결제`
      })

    if (paymentError) {
      console.error('Error saving payment record:', paymentError)
    }

    // 프로필에 프리미엄 상태 업데이트
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating premium status:', profileError)
    }

    console.log(`Subscription activated for user ${userId}`)
  } catch (error) {
    console.error('Error handling checkout completion:', error)
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // 결제 성공 로직
  console.log('Payment succeeded:', paymentIntent.id)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // 결제 실패 로직
  console.log('Payment failed:', paymentIntent.id)
  
  // 결제 실패 상태 업데이트
  const { error } = await supabase
    .from('payments')
    .update({ payment_status: 'failed' })
    .eq('provider_payment_id', paymentIntent.id)

  if (error) {
    console.error('Error updating payment status:', error)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  // 구독 생성 로직
  console.log('Subscription created:', subscription.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // 구독 삭제 로직
  console.log('Subscription deleted:', subscription.id)

  const customerId = subscription.customer as string
  
  // 고객 정보에서 사용자 ID 찾기
  const customer = await stripe.customers.retrieve(customerId)
  
  if (customer && !customer.deleted && customer.metadata?.userId) {
    const userId = customer.metadata.userId

    // 구독 상태를 취소로 업데이트
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (subscriptionError) {
      console.error('Error updating subscription status:', subscriptionError)
    }

    // 프리미엄 상태 제거
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', userId)

    if (profileError) {
      console.error('Error removing premium status:', profileError)
    }
  }
}