'use client'

import { useEffect } from 'react'
import { t, detectLangFromNavigator } from '@/lib/i18n'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const lang = detectLangFromNavigator()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fce7f3, #ede9fe)',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>
          {t('error.generic', lang)}
        </h2>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem', fontFamily: 'monospace' }}>
            {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.5rem',
              background: '#e91e63',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {t('error.retry', lang)}
          </button>
          <a
            href="/"
            style={{
              padding: '0.625rem 1.5rem',
              background: '#f3f4f6',
              color: '#374151',
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.9rem',
            }}
          >
            {t('error.go_home', lang)}
          </a>
        </div>
      </div>
    </div>
  )
}
