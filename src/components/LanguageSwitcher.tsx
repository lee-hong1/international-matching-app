'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Locale } from '@/lib/i18n'

const LANGS = [
  { code: 'ko' as Locale, label: '한국어' },
  { code: 'en' as Locale, label: 'English' },
  { code: 'ja' as Locale, label: '日本語' },
  { code: 'zh' as Locale, label: '中文' },
]

interface LanguageSwitcherProps {
  current?: string
  onChange?: (lang: string) => void
}

export function LanguageSwitcher({ current, onChange }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage()
  const activeLang = current ?? locale
  const [open, setOpen] = useState(false)
  const currentLang = LANGS.find((l) => l.code === activeLang) ?? LANGS[0]

  function select(code: Locale) {
    setOpen(false)
    setLocale(code)
    onChange?.(code)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.375rem 0.625rem',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: '#fff',
          fontSize: '0.8rem',
          color: '#374151',
          cursor: 'pointer',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        🌐 {currentLang.label}
        <span style={{ fontSize: '0.6rem', marginLeft: 2 }}>▼</span>
      </button>
      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 100,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            listStyle: 'none',
            padding: '0.25rem',
            zIndex: 50,
          }}
        >
          {LANGS.map((l) => (
            <li
              key={l.code}
              role="option"
              aria-selected={l.code === activeLang}
              onClick={() => select(l.code)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.825rem',
                cursor: 'pointer',
                background: l.code === activeLang ? '#f3f4f6' : 'transparent',
                fontWeight: l.code === activeLang ? 600 : 400,
              }}
            >
              {l.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
