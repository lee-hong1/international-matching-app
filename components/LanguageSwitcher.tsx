'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LOCALE_LABELS, LOCALE_FLAG, type Locale } from '@/lib/i18n'

const LOCALES: Locale[] = ['ko', 'en', 'zh', 'ja']

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700"
      >
        <span>{LOCALE_FLAG[locale]}</span>
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => { setLocale(l); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                  locale === l ? 'text-pink-600 font-semibold bg-pink-50' : 'text-gray-700'
                }`}
              >
                <span>{LOCALE_FLAG[l]}</span>
                <span>{LOCALE_LABELS[l]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
