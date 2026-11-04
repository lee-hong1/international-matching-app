import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ReviewCard from '@/components/ReviewCard'
import { detectLangFromHeader, t } from '@/lib/i18n'

interface PublicProfile {
  id: string
  display_name: string | null
  country: string | null
  trust_score: number
  trust_badge: string | null
  avatar_url: string | null
  bio: string | null
  is_adult: boolean
}

interface Service {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  duration_minutes: number
  category: string
}

interface Review {
  id: string
  rating: number
  comment?: string | null
  is_public: boolean
  created_at: string
  reviewer?: { display_name?: string | null; country?: string | null } | null
}

async function fetchProfile(id: string): Promise<PublicProfile | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/profiles/${id}`, { next: { revalidate: 60 } })
  if (!res.ok) return null
  return res.json()
}

async function fetchServices(hostId: string): Promise<Service[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/services?host_id=${hostId}`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.services ?? data ?? []
}

async function fetchReviews(hostId: string): Promise<Review[]> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/reviews?host_id=${hostId}&limit=10`, { next: { revalidate: 60 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.reviews ?? data ?? []
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const profile = await fetchProfile(id)
  if (!profile) return { title: 'Host Not Found' }
  const name = profile.display_name ?? 'Host'
  const country = profile.country ? ` (${profile.country})` : ''
  return {
    title: `${name}${country} — GlobalMatch`,
    description: profile.bio ?? `Meet ${name} on GlobalMatch`,
  }
}

const BADGE_LABEL: Record<string, string> = {
  verified: '✓',
  premium: '★',
  elite: '♦',
}

const CURRENCY_SYMBOL: Record<string, string> = {
  KRW: '₩',
  JPY: '¥',
  CNY: '¥',
  USD: '$',
}

export default async function HostProfilePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const headersList = await headers()
  const lang = detectLangFromHeader(headersList.get('accept-language') ?? '')

  const [profile, services, reviews] = await Promise.all([
    fetchProfile(id),
    fetchServices(id),
    fetchReviews(id),
  ])

  if (!profile) notFound()

  const badge = profile.trust_badge && profile.trust_badge !== 'none'
    ? BADGE_LABEL[profile.trust_badge]
    : null

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Profile header */}
      <section style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name ?? 'Host'}
            width={96}
            height={96}
            style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 96, height: 96, borderRadius: '50%', background: '#e91e63',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '2rem', flexShrink: 0,
          }}>
            {(profile.display_name ?? 'U')[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>
            {profile.display_name ?? 'Host'}
            {badge && (
              <span style={{ marginLeft: '0.5rem', fontSize: '1rem', color: '#e91e63' }} title={profile.trust_badge ?? ''}>
                {badge}
              </span>
            )}
          </h1>
          {profile.country && (
            <p style={{ margin: '0 0 0.5rem', color: '#666' }}>{profile.country}</p>
          )}
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#888' }}>
            <span>{t('profile.host_since', lang)}</span>
            {profile.trust_score > 0 && (
              <span>Trust: {profile.trust_score}/100</span>
            )}
          </div>
          {profile.bio && (
            <p style={{ marginTop: '0.75rem', color: '#444', maxWidth: 480 }}>{profile.bio}</p>
          )}
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            {t('profile.book_now', lang)}
          </h2>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {services.map((svc) => (
              <div key={svc.id} style={{
                border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem',
              }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{svc.title}</h3>
                {svc.description && (
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#666' }}>
                    {svc.description}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600, color: '#e91e63' }}>
                    {CURRENCY_SYMBOL[svc.currency] ?? ''}{svc.price.toLocaleString()}
                  </span>
                  <span style={{ color: '#888' }}>{svc.duration_minutes}min</span>
                </div>
                <a
                  href={`/book/${svc.id}?host=${id}`}
                  style={{
                    display: 'block', marginTop: '0.75rem', textAlign: 'center',
                    background: '#e91e63', color: '#fff', padding: '0.5rem',
                    borderRadius: 6, textDecoration: 'none', fontSize: '0.9rem',
                  }}
                >
                  {t('profile.book_now', lang)}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          {t('profile.reviews', lang)}
        </h2>
        {reviews.length === 0 ? (
          <p style={{ color: '#888' }}>{t('review.empty', lang)}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} lang={lang} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
