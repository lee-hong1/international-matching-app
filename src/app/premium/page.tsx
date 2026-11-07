'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { paymentService, SubscriptionPlan, UserSubscription } from '@/lib/stripe'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

export default function PremiumPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { locale: lang } = useLanguage()
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
    const locale = lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US'
    return new Intl.NumberFormat(locale).format(price)
  }

  const calculateMonthlyPrice = (price: number, months: number) => {
    return Math.floor(price / months)
  }

  const formatExpiryDate = (dateStr: string) => {
    const locale = lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US'
    return new Date(dateStr).toLocaleDateString(locale)
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

  const featureRows = [
    { key: 'daily_likes', free: t('premium.feat_daily_likes_free', lang), premium: t('premium.feat_unlimited', lang) },
    { key: 'super_like',  free: t('premium.feat_super_like_free', lang),  premium: t('premium.feat_unlimited', lang) },
    { key: 'filter',      free: t('premium.feat_basic', lang),             premium: t('premium.feat_advanced', lang) },
    { key: 'translation', free: '❌',                                      premium: '✅' },
    { key: 'read_receipt',free: '❌',                                      premium: '✅' },
    { key: 'priority',    free: '❌',                                      premium: '✅' },
    { key: 'ads',         free: t('premium.feat_ads_free', lang),          premium: t('premium.feat_ads_premium', lang) },
    { key: 'support',     free: t('premium.feat_basic', lang),             premium: t('premium.feat_support_premium', lang) },
  ]

  const faqItems = [
    { q: t('premium.faq_cancel_q', lang),  a: t('premium.faq_cancel_a', lang) },
    { q: t('premium.faq_payment_q', lang), a: t('premium.faq_payment_a', lang) },
    { q: t('premium.faq_refund_q', lang),  a: t('premium.faq_refund_a', lang) },
    { q: t('premium.faq_instant_q', lang), a: t('premium.faq_instant_a', lang) },
  ]

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
              {t('premium.back', lang)}
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
                <h2 className="text-2xl font-bold mb-2">{t('premium.already_member', lang)}</h2>
                <p className="text-purple-100">
                  {t('premium.expiry_label', lang)} {formatExpiryDate(currentSubscription.end_date)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-purple-200">{t('premium.status_label', lang)}</div>
                <div className="text-xl font-semibold">
                  {currentSubscription.status === 'active'
                    ? t('premium.status_active', lang)
                    : t('premium.status_inactive', lang)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 헤더 섹션 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('premium.headline_prefix', lang)}
            <span className="text-purple-600">{t('premium.headline_highlight', lang)}</span>
            {t('premium.headline_suffix', lang)}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('premium.subheadline', lang)}
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
                    {t('premium.most_popular', lang)}
                  </div>
                )}

                {index === 2 && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    {t('premium.savings_badge', lang, { savings: String(savings) })}
                  </div>
                )}

                <div className={`p-8 ${isPopular ? 'pt-12' : ''}`}>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">₩{formatPrice(monthlyPrice)}</span>
                    <span className="text-gray-600">{t('premium.per_month', lang)}</span>
                    {plan.duration_months > 1 && (
                      <div className="text-sm text-gray-500 mt-1">
                        {t('premium.total_price', lang, { price: formatPrice(plan.price), months: String(plan.duration_months) })}
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
                    {selectedPlan === plan.id
                      ? t('premium.processing', lang)
                      : currentSubscription
                        ? t('premium.already_subscribed', lang)
                        : t('premium.subscribe_cta', lang)}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 기능 비교 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('premium.feature_comparison', lang)}</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">{t('premium.col_feature', lang)}</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">{t('premium.col_free', lang)}</th>
                  <th className="text-center py-4 px-6 font-semibold text-purple-600">{t('premium.col_premium', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {featureRows.map((row) => (
                  <tr key={row.key}>
                    <td className="py-4 px-6 text-gray-900">{t(`premium.feat_${row.key}`, lang)}</td>
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
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('premium.faq_title', lang)}</h2>

          <div className="space-y-6 max-w-3xl mx-auto">
            {faqItems.map((faq, index) => (
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
