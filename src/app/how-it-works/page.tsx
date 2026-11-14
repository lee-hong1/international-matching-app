'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

const STEPS = [
  { num: '01', icon: '✍️', titleKey: 'hiw.step1_title', descKey: 'hiw.step1_desc' },
  { num: '02', icon: '✅', titleKey: 'hiw.step2_title', descKey: 'hiw.step2_desc' },
  { num: '03', icon: '🔍', titleKey: 'hiw.step3_title', descKey: 'hiw.step3_desc' },
  { num: '04', icon: '💞', titleKey: 'hiw.step4_title', descKey: 'hiw.step4_desc' },
  { num: '05', icon: '💬', titleKey: 'hiw.step5_title', descKey: 'hiw.step5_desc' },
  { num: '06', icon: '📅', titleKey: 'hiw.step6_title', descKey: 'hiw.step6_desc' },
]

export default function HowItWorksPage() {
  const { locale: lang } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/signup" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
            {t('hiw.cta', lang)}
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('hiw.title', lang)}</h1>
          <p className="text-lg text-gray-500">{t('hiw.subtitle', lang)}</p>
        </div>
        <div className="space-y-8 mb-14">
          {STEPS.map(step => (
            <div key={step.num} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-2xl">{step.icon}</div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold text-purple-500 tracking-widest">{step.num}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{t(step.titleKey, lang)}</h3>
                </div>
                <p className="text-gray-600">{t(step.descKey, lang)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/signup" className="inline-block bg-purple-600 text-white font-semibold px-10 py-4 rounded-xl text-lg hover:bg-purple-700 transition-colors shadow-lg">
            {t('hiw.cta', lang)} 💕
          </Link>
        </div>
      </main>
    </div>
  )
}
