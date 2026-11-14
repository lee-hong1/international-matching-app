import { headers } from 'next/headers'
import { detectLangFromHeader, t } from '@src/lib/i18n'
import { supabaseService } from '@src/lib/commerce'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getEarningsSummary(hostId: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: monthly }, { count }] = await Promise.all([
    supabaseService
      .from('booking_commissions')
      .select('net_amount')
      .eq('host_id', hostId)
      .eq('status', 'settled')
      .gte('created_at', monthStart),
    supabaseService
      .from('booking_commissions')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', hostId)
      .eq('status', 'settled'),
  ])

  const monthly_net = (monthly ?? []).reduce(
    (sum, row) => sum + Number(row.net_amount),
    0
  )

  return { monthly_net: Math.round(monthly_net), total_completed: count ?? 0 }
}

export default async function HostDashboardPage() {
  const headersList = await headers()
  const lang = detectLangFromHeader(headersList.get('accept-language') ?? '')

  // SSR로 현재 로그인 호스트 ID 조회
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  const earnings = user
    ? await getEarningsSummary(user.id).catch(() => null)
    : null

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

  const fmtKRW = (n: number) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(n)

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        {t('host.dashboard_title', lang)}
      </h1>

      {/* ── 수익 위젯 ─────────────────────────────────────────────────────── */}
      {earnings !== null && (
        <div
          style={{
            display: 'flex', gap: '1rem', marginBottom: '1.5rem',
            padding: '1.25rem', borderRadius: 10,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: 4 }}>
              {t('commission.earnings_title', lang)}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
              {fmtKRW(earnings.monthly_net)}
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: 4 }}>
              {t('commission.platform_fee', lang)}
            </div>
          </div>
          <div style={{ textAlign: 'right', flex: 0 }}>
            <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: 4 }}>
              {t('commission.total_completed', lang)}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
              {earnings.total_completed}
            </div>
          </div>
        </div>
      )}

      {/* ── 메뉴 ─────────────────────────────────────────────────────────── */}
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
