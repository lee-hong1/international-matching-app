import { headers } from 'next/headers'
import { t, detectLangFromHeader } from '@src/lib/i18n'

export default async function NotFound() {
  const headersList = await headers()
  const lang = detectLangFromHeader(headersList.get('accept-language') ?? '')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fce7f3, #ede9fe)',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400 }}>
        <div style={{
          fontSize: '5rem',
          fontWeight: 900,
          color: '#e91e63',
          lineHeight: 1,
          marginBottom: '0.5rem',
        }}>
          404
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111827' }}>
          {t(lang, 'error_not_found')}
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {t(lang, 'error_generic')}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.75rem',
            background: '#e91e63',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          {t(lang, 'error_go_home')}
        </a>
      </div>
    </div>
  )
}
