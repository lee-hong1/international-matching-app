'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { paymentService, SubscriptionPlan, UserSubscription } from '@/lib/stripe'

export default function PremiumPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<string>('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadData()
    }
  }, [user, loading, router])

  const loadData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const [plansData, subscriptionData] = await Promise.all([
        paymentService.getSubscriptionPlans(),
        paymentService.getUserSubscription(user.id)
      ])

      setPlans(plansData)
      setCurrentSubscription(subscriptionData)
    } catch (error) {
      console.error('Error loading premium data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!user) return

    setSelectedPlan(planId)
    try {
      const session = await paymentService.createCheckoutSession(user.id, planId)
      await paymentService.redirectToCheckout(session.sessionId)
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to load checkout. Please try again.')
    } finally {
      setSelectedPlan('')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  const calculateMonthlyPrice = (price: number, months: number) => {
    return Math.floor(price / months)
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-2xl font-bold text-purple-600"
              >
                💕 GlobalMatch
              </button>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-purple-600"
            >
              ← 돌아가기
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 현재 구독 상태 */}
        {currentSubscription && (
          <div className="mb-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">🎉 프리미엄 회원이시네요!</h2>
                <p className="text-purple-100">
                  구독 만료일: {new Date(currentSubscription.end_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-purple-200">상태</div>
                <div className="text-xl font-semibold">
                  {currentSubscription.status === 'active' ? '활성' : '비활성'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 헤더 섹션 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            프리미엄으로 <span className="text-purple-600">더 많은 인연</span>을 만나세요
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            프리미엄 기능으로 더 빠르고 효과적으로 특별한 사람을 만날 수 있습니다
          </p>
        </div>

        {/* 요금제 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const monthlyPrice = calculateMonthlyPrice(plan.price, plan.duration_months)
            const isPopular = index === 1
            const savings = index === 2 ? Math.round(((plans[0].price * 12 - plan.price) / (plans[0].price * 12)) * 100) : 0

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                  isPopular ? 'ring-2 ring-purple-600 transform scale-105' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-2 text-sm font-semibold">
                    가장 인기있는 플랜
                  </div>
                )}
                
                {index === 2 && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    {savings}% 절약
                  </div>
                )}

                <div className={`p-8 ${isPopular ? 'pt-12' : ''}`}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">₩{formatPrice(monthlyPrice)}</span>
                    <span className="text-gray-600">/월</span>
                    {plan.duration_months > 1 && (
                      <div className="text-sm text-gray-500 mt-1">
                        총 ₩{formatPrice(plan.price)} ({plan.duration_months}개월)
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={selectedPlan === plan.id || !!currentSubscription}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                      isPopular
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {selectedPlan === plan.id ? '처리 중...' : 
                     currentSubscription ? '이미 구독 중' : '시작하기'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 기능 비교 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">기능 비교</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">기능</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">무료</th>
                  <th className="text-center py-4 px-6 font-semibold text-purple-600">프리미엄</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  { feature: '일일 좋아요 횟수', free: '5회', premium: '무제한' },
                  { feature: '슈퍼 좋아요', free: '1회/주', premium: '무제한' },
                  { feature: '매칭 필터', free: '기본', premium: '고급' },
                  { feature: '메시지 번역', free: '❌', premium: '✅' },
                  { feature: '읽음 확인', free: '❌', premium: '✅' },
                  { feature: '우선 노출', free: '❌', premium: '✅' },
                  { feature: '광고', free: '표시됨', premium: '제거됨' },
                  { feature: '고객 지원', free: '기본', premium: '24/7 프리미엄' }
                ].map((row, index) => (
                  <tr key={index}>
                    <td className="py-4 px-6 text-gray-900">{row.feature}</td>
                    <td className="py-4 px-6 text-center text-gray-600">{row.free}</td>
                    <td className="py-4 px-6 text-center text-purple-600 font-semibold">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">자주 묻는 질문</h2>
          
          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              {
                q: '언제든지 구독을 취소할 수 있나요?',
                a: '네, 언제든지 구독을 취소할 수 있습니다. 취소 후에도 구독 기간이 끝날 때까지는 프리미엄 기능을 계속 사용할 수 있습니다.'
              },
              {
                q: '결제는 어떻게 이루어지나요?',
                a: '신용카드, 체크카드를 통해 결제할 수 있습니다. 모든 결제는 Stripe을 통해 안전하게 처리됩니다.'
              },
              {
                q: '환불이 가능한가요?',
                a: '서비스 이용 후 7일 이내에는 전액 환불이 가능합니다. 그 이후에는 잔여 기간에 대해 부분 환불됩니다.'
              },
              {
                q: '프리미엄 기능이 즉시 적용되나요?',
                a: '네, 결제 완료 즉시 모든 프리미엄 기능을 사용할 수 있습니다.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}