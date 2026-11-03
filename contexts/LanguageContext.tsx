'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Locale, t as translate, type TranslationKeys } from '@/lib/i18n'

type LanguageContextType = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: keyof TranslationKeys) => string
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'ko',
  setLocale: () => {},
  t: (key) => key as string,
})

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'ko'
  const lang = navigator.language?.toLowerCase() ?? ''
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('ja')) return 'ja'
  if (lang.startsWith('ko')) return 'ko'
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('locale') as Locale | null
      setLocaleState(saved ?? detectBrowserLocale())
    } catch {
      setLocaleState(detectBrowserLocale())
    }
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    try { localStorage.setItem('locale', l) } catch {}
  }

  const t = (key: keyof TranslationKeys) => translate(locale, key)

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export type { TranslationKeys }
