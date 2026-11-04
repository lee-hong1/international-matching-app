import { headers } from 'next/headers'
import { detectLangFromHeader, t } from '@/lib/i18n'

export default async function HostDashboardPage() {
  const headersList = await headers()
  const lang = detectLangFromHeader(headersList.get('accept-language') ?? '')

  const items = [
    {
      href: '/host/availability',
      label: t('availability.title', lang),
      description: t('availability.empty', lang),
    },
    {
      href: '/host/services',
      label: t('host.services_title', lang),
      description: t('host.services_desc', lang),
    },
    {
      href: '/bookings',
      label: t('host.bookings_title', lang),
      description: t('host.bookings_desc', lang),
    },
  ]

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        {t('host.dashboard_title', lang)}
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'block', padding: '1rem 1.25rem',
              border: '1px solid #e5e7eb', borderRadius: 8,
              textDecoration: 'none', color: 'inherit',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.label}</div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>{item.description}</div>
          </a>
        ))}
      </div>
    </main>
  )
}
