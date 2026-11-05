import { headers, cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ReviewCard from '@src/components/ReviewCard'
import TrustBadge from '@src/components/TrustBadge'
import { CURRENCY_SYMBOL } from '@src/lib/currency'
import { detectLangFromHeader, t } from '@src/lib/i18n'

interface Service {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  duration_minutes: number
  category: string
  host_id: string
  is_active: boolean
}

interface PublicProfile {
  id: string
  display_name: string | null
  country: string | null
  trust_score: number
  trust_badge: string | null
  avatar_url: string | null
  bio: string | null
}

interface Review {
  id: string
  rating: number
  comment?: string | null
  is_public: boolean
  created_at: string
  reviewer?: { display_name?: string | null; country?: string | null } | null
}

async function fetchService(id: string): Promise<Service | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/services/${id}`, { next: { revalidate: 60 } })
  if (!res.ok) return null
  return res.json()
}

async function fetchProfile(hostId: string): Promise<PublicProfile | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/profiles/${hostId}`, { next: { revalidate: 60 } })
  if (!res.ok) return null
  return res.json()
}

async function fetchReviews(hostId: string): Promise<Review[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/reviews?host_id=${hostId}&limit=3`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.reviews ?? data ?? []
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const svc = await fetchService(id)
  if (!svc) return { title: 'Service Not Found' }
  return {
    title: `${svc.title} — GlobalMatch`,
    description: svc.description ?? `Book ${svc.title} on GlobalMatch`,
  }
}

export default async function ServiceDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const lang = detectLangFromHeader(headersList.get('accept-language') ?? '')

  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] ?? ''
  const hasSession = !!(
    cookieStore.get('sb-access-token')?.value ??
    (projectRef && cookieStore.get(`sb-${projectRef}-auth-token`)?.value)
  )

  const svc = await fetchService(id)
  if (!svc) notFound()

  const [host, reviews] = await Promise.all([
    fetchProfile(svc.host_id),
    fetchReviews(svc.host_id),
  ])

  const currencySymbol = CURRENCY_SYMBOL[svc.currency] ?? ''
  const durationLabel = t('services.duration_min', lang).replace('{n}', String(svc.duration_minutes))

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* 비활성 배너 */}
      {!svc.is_active && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem',
          color: '#92400e', fontWeight: 500,
        }}>
          {t('services.inactive', lang)}
        </div>
      )}

      {/* 서비스 헤더 */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          {svc.category}
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 1rem' }}>{svc.title}</h1>

        {/* 가격 + 시간 뱃지 */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#fdf2f8', color: '#be185d',
            padding: '0.4rem 0.9rem', borderRadius: 99,
            fontWeight: 700, fontSize: '1.1rem',
          }}>
            {currencySymbol}{svc.price.toLocaleString()}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#f0fdf4', color: '#166534',
            padding: '0.4rem 0.9rem', borderRadius: 99, fontSize: '0.9rem',
          }}>
            ⏱ {durationLabel}
          </span>
        </div>

        {svc.description && (
          <p style={{ color: '#374151', lineHeight: 1.7, maxWidth: 600 }}>{svc.description}</p>
        )}
      </section>

      {/* 예약 CTA */}
      {svc.is_active && (
        <section style={{ marginBottom: '2rem' }}>
          {hasSession ? (
            <a
              href={`/book/${svc.id}?host=${svc.host_id}`}
              style={{
                display: 'inline-block', background: '#e91e63', color: '#fff',
                padding: '0.75rem 2rem', borderRadius: 8, textDecoration: 'none',
                fontWeight: 600, fontSize: '1rem',
              }}
            >
              {t('services.book_now', lang)}
            </a>
          ) : (
            <a
              href={`/login?returnUrl=${encodeURIComponent(`/book/${svc.id}?host=${svc.host_id}`)}`}
              style={{
                display: 'inline-block', background: '#e91e63', color: '#fff',
                padding: '0.75rem 2rem', borderRadius: 8, textDecoration: 'none',
                fontWeight: 600, fontSize: '1rem',
              }}
            >
              {t('services.login_to_book', lang)}
            </a>
          )}
        </section>
      )}

      {/* 호스트 정보 */}
      {host && (
        <section style={{
          border: '1px solid #e5e7eb', borderRadius: 12,
          padding: '1.25rem', marginBottom: '2rem',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem', color: '#6b7280' }}>
            {t('services.host_info', lang)}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {host.avatar_url ? (
              <img
                src={host.avatar_url}
                alt={host.display_name ?? 'Host'}
                width={56}
                height={56}
                style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#e91e63',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '1.25rem', flexShrink: 0,
              }}>
                {(host.display_name ?? 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{host.display_name ?? 'Host'}</span>
                {host.country && <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{host.country}</span>}
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <TrustBadge
                  trustScore={host.trust_score}
                  trustBadge={(host.trust_badge ?? 'none') as 'none' | 'verified' | 'premium' | 'elite'}
                  lang={lang}
                />
              </div>
              {host.bio && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#4b5563', maxWidth: 420 }}>
                  {host.bio}
                </p>
              )}
              <a
                href={`/host/${host.id}`}
                style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.85rem', color: '#e91e63' }}
              >
                {t('services.view_host', lang)} →
              </a>
            </div>
          </div>
        </section>
      )}

      {/* 최근 리뷰 */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          {t('services.reviews_title', lang)}
        </h2>
        {reviews.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>{t('review.empty', lang)}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map(r => (
              <ReviewCard key={r.id} review={r} lang={lang} />
            ))}
          </div>
        )}
        {host && (
          <a
            href={`/host/${host.id}`}
            style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}
          >
            {t('profile.reviews', lang)} →
          </a>
        )}
      </section>
    </main>
  )
}
