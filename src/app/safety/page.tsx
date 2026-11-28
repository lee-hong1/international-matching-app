'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

export default function SafetyPage() {
  const { locale: lang } = useLanguage()
  const features = [
    { icon: '🪪', titleKey: 'safety.id_title',      descKey: 'safety.id_desc' },
    { icon: '🔞', titleKey: 'safety.age_title',     descKey: 'safety.age_desc' },
    { icon: '🤖', titleKey: 'safety.ai_title',      descKey: 'safety.ai_desc' },
    { icon: '🚨', titleKey: 'safety.report_title',  descKey: 'safety.report_desc' },
    { icon: '🔒', titleKey: 'safety.private_title', descKey: 'safety.private_desc' },
  ]
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/login" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
            {t('static.sign_in', lang)}
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('safety.title', lang)}</h1>
        <p className="text-lg text-gray-500 mb-12">{t('safety.subtitle', lang)}</p>
        {features.map(item => (
          <div key={item.titleKey} className="flex gap-5 mb-8">
            <div className="text-3xl flex-shrink-0">{item.icon}</div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{t(item.titleKey, lang)}</h3>
              <p className="text-gray-600">{t(item.descKey, lang)}</p>
            </div>
          </div>
        ))}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">
          <h2 className="font-semibold text-red-800 mb-2">🆘 Emergency? Report immediately</h2>
          <p className="text-red-700 text-sm mb-3">If you feel unsafe or witness a serious violation, contact us immediately.</p>
          <Link href="/contact" className="text-red-600 font-medium text-sm hover:underline">Contact Safety Team →</Link>
        </div>
      </main>
    </div>
  )
}
