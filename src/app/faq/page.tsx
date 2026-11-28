'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

export default function FAQPage() {
  const { locale: lang } = useLanguage()
  const faqs = [
    { qKey: 'faq.q1', aKey: 'faq.a1' },
    { qKey: 'faq.q2', aKey: 'faq.a2' },
    { qKey: 'faq.q3', aKey: 'faq.a3' },
    { qKey: 'faq.q4', aKey: 'faq.a4' },
  ]
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/contact" className="text-sm text-gray-600 hover:text-purple-600">
            {t('help.contact_btn', lang)} →
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('faq.title', lang)}</h1>
        <p className="text-gray-500 mb-12">{t('faq.subtitle', lang)}</p>
        <div className="space-y-6">
          {faqs.map((item) => (
            <details key={item.qKey} className="group border border-gray-200 rounded-xl p-5 cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-gray-900 list-none">
                {t(item.qKey, lang)}
                <span className="text-purple-500 text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">{t(item.aKey, lang)}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center p-8 bg-purple-50 rounded-xl">
          <Link href="/contact" className="inline-block bg-purple-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-purple-700">
            {t('help.contact_btn', lang)}
          </Link>
        </div>
      </main>
    </div>
  )
}
