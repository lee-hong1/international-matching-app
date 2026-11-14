'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

export default function HelpPage() {
  const { locale: lang } = useLanguage()
  const topics = [
    { icon: '🚀', titleKey: 'help.getting_started', descKey: 'help.gs_desc' },
    { icon: '🛡️', titleKey: 'help.safety_tips',     descKey: 'help.safety_desc' },
    { icon: '✉️', titleKey: 'help.contact_us',      descKey: 'help.contact_desc' },
  ]
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/contact" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
            {t('help.contact_us', lang)}
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('help.title', lang)}</h1>
          <p className="text-gray-500">{t('help.subtitle', lang)}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {topics.map(topic => (
            <div key={topic.titleKey} className="border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors">
              <div className="text-3xl mb-3">{topic.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{t(topic.titleKey, lang)}</h3>
              <p className="text-sm text-gray-600">{t(topic.descKey, lang)}</p>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700">
              {t('help.contact_btn', lang)}
            </Link>
            <Link href="/faq" className="px-6 py-3 border border-purple-600 text-purple-600 font-medium rounded-lg hover:bg-purple-50">
              {t('faq.title', lang)}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
