'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

export default function AboutPage() {
  const { locale: lang } = useLanguage()
  const features = [
    { icon: '🌏', titleKey: 'about.global_title', descKey: 'about.global_desc' },
    { icon: '🛡️', titleKey: 'about.safety_title', descKey: 'about.safety_desc' },
    { icon: '💎', titleKey: 'about.premium_title', descKey: 'about.premium_desc' },
  ]
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/signup" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
            {t('static.join_free', lang)}
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">{t('about.title', lang)}</h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">{t('about.desc', lang)}</p>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map(item => (
            <div key={item.titleKey} className="text-center p-6 rounded-xl bg-purple-50">
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{t(item.titleKey, lang)}</h3>
              <p className="text-sm text-gray-600">{t(item.descKey, lang)}</p>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">{t('about.cta_title', lang)}</h2>
          <p className="mb-6 opacity-90">{t('about.cta_desc', lang)}</p>
          <Link href="/signup" className="inline-block bg-white text-purple-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors">
            {t('about.cta_btn', lang)}
          </Link>
        </div>
      </main>
    </div>
  )
}
