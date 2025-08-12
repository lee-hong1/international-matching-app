import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

// Stripe 초기화
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  duration_months: number
  features: string[]
  is_active: boolean
  stripe_price_id?: string
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  start_date: string
  end_date: string
  status: 'active' | 'cancelled' | 'expired'
  payment_id?: string
}

export const paymentService = {
  // Stripe 객체 가져오기
  async getStripe() {
    return await stripePromise
  },

  // 구독 플랜 목록 가져오기
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) {
      console.error('Error fetching subscription plans:', error)
      return []
    }

    return data || []
  },

  // 사용자의 현재 구독 정보 가져오기
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user subscription:', error)
      return null
    }

    return data
  },

  // Stripe 결제 세션 생성
  async createCheckoutSession(userId: string, planId: string) {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planId,
        }),
      })

      const session = await response.json()
      
      if (session.error) {
        throw new Error(session.error)
      }

      return session
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw error
    }
  },

  // Stripe 결제 페이지로 리디렉션
  async redirectToCheckout(sessionId: string) {
    const stripe = await this.getStripe()
    if (!stripe) {
      throw new Error('Stripe not loaded')
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId,
    })

    if (error) {
      console.error('Error redirecting to checkout:', error)
      throw error
    }
  },

  // 구독 취소
  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
        }),
      })

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  },

  // 결제 내역 가져오기
  async getPaymentHistory(userId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        user_subscriptions(
          subscription_plans(name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payment history:', error)
      return []
    }

    return data || []
  },

  // 프리미엄 기능 확인
  async checkPremiumAccess(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    return subscription ? subscription.status === 'active' : false
  },

  // 결제 완료 후 구독 정보 업데이트
  async updateSubscriptionStatus(sessionId: string, status: 'completed' | 'failed') {
    try {
      const response = await fetch('/api/update-subscription-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          status,
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error updating subscription status:', error)
      throw error
    }
  }
}

// 기본 구독 플랜 데이터
export const defaultPlans: Omit<SubscriptionPlan, 'id'>[] = [
  {
    name: '베이직',
    price: 9900,
    duration_months: 1,
    features: [
      '무제한 좋아요',
      '하루 5번 슈퍼 좋아요',
      '광고 제거',
      '기본 매칭 필터'
    ],
    is_active: true
  },
  {
    name: '프리미엄',
    price: 24900,
    duration_months: 3,
    features: [
      '베이직 플랜 모든 기능',
      '무제한 슈퍼 좋아요',
      '고급 매칭 필터',
      '우선 프로필 노출',
      '읽음 확인',
      '메시지 번역 기능'
    ],
    is_active: true
  },
  {
    name: '골드',
    price: 79900,
    duration_months: 12,
    features: [
      '프리미엄 플랜 모든 기능',
      '프로필 부스트 (주 1회)',
      '익명 모드',
      '매칭 통계 분석',
      '24/7 프리미엄 고객지원',
      '특별 이벤트 초대'
    ],
    is_active: true
  }
]