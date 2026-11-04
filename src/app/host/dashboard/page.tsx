import { headers } from 'next/headers'
import { detectLangFromHeader, t } from '@/lib/i18n'

const NAV_ITEMS = [
  { href: '/host/availability', labelKey: 'availability.title' },
  { href: '/host/services', labelKey: 'availability.title' },
  { href: '/bookings', labelKey: 'availability.title' },
] as const

interface NavItem {
  href: string
  label: string
  description: string
}

export default async function HostDashboardPage() {
  const headersList = await headers()
  const lang = detectLangFromHeader(headersList.get('accept-language') ?? '')

  const items: NavItem[] = [
    {
      href: '/host/availability',
      label: t('availability.title', lang),
      description: t('availability.empty', lang),
    },
    {
      href: '/api/services',
      label: lang === 'ko' ? '내 서비스 관리' : lang === 'ja' ? 'サービス管理' : lang === 'zh' ? '服务管理' : 'Manage Services',
      description: lang === 'ko' ? '서비스 등록 및 수정' : lang === 'ja' ? 'サービスの登録・編集' : lang === 'zh' ? '注册和编辑服务' : 'Register and edit services',
    },
    {
      href: '/api/bookings/hosted',
      label: lang === 'ko' ? '예약 관리' : lang === 'ja' ? '予約管理' : lang === 'zh' ? '预订管理' : 'Manage Bookings',
      description: lang === 'ko' ? '들어온 예약 확인 및 처리' : lang === 'ja' ? '予約の確認・対応' : lang === 'zh' ? '查看和处理预订' : 'View and handle incoming bookings',
    },
  ]

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        {lang === 'ko' ? '호스트 대시보드' : lang === 'ja' ? 'ホストダッシュボード' : lang === 'zh' ? '主机仪表板' : 'Host Dashboard'}
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
