'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { t, detectLangFromNavigator, type Lang } from '@src/lib/i18n'
import { formatBookingTime } from '@src/lib/datetime'

interface Booking {
  id: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  booked_at: string
  timezone: string
  notes?: string
  services?: { title: string; duration_minutes: number; price: number; currency: string }
  profiles?: { display_name: string; country: string }
}

type Tab = 'upcoming' | 'completed' | 'cancelled'

function statusLabel(status: string, lang: Lang): string {
  const map: Record<string, string> = {
    pending: t('bookings.status_pending', lang),
    confirmed: t('bookings.status_confirmed', lang),
    completed: t('bookings.status_completed', lang),
    cancelled: t('bookings.status_cancelled', lang),
  }
  return map[status] ?? status
}

function statusColor(status: string): string {
  if (status === 'confirmed') return '#16a34a'
  if (status === 'pending') return '#d97706'
  if (status === 'completed') return '#2563eb'
  return '#6b7280'
}

interface ReviewFormProps {
  bookingId: string
  lang: Lang
  onClose: () => void
  onSuccess: () => void
}

function ReviewForm({ bookingId, lang, onClose, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, rating, comment: comment || undefined }),
      })
      if (res.status === 409) {
        setError(t('review.error', lang))
        return
      }
      if (!res.ok) {
        setError(t('review.error', lang))
        return
      }
      onSuccess()
    } catch {
      setError(t('error.network', lang))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ marginBottom: 16 }}>{t('review.write', lang)}</h3>

        <label style={labelStyle}>{t('review.rating', lang)}</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              style={{
                fontSize: 24,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                opacity: n <= rating ? 1 : 0.3,
              }}
              aria-label={`${n} star`}
            >
              ★
            </button>
          ))}
        </div>

        <label style={labelStyle}>{t('review.comment', lang)}</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }}
        />

        {error && <p style={{ color: '#dc2626', marginBottom: 8, fontSize: '0.875rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} disabled={loading} style={primaryBtn}>
            {loading ? '…' : t('review.submit', lang)}
          </button>
          <button onClick={onClose} style={secondaryBtn}>{t('book.cancel', lang)}</button>
        </div>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('ko')
  const [tab, setTab] = useState<Tab>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null)

  useEffect(() => { setLang(detectLangFromNavigator()) }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/bookings')
    }
  }, [user, authLoading, router])

  async function fetchBookings(reset: boolean) {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (!reset && cursor) params.set('cursor', cursor)

      const statusFilter: Record<Tab, string[]> = {
        upcoming: ['pending', 'confirmed'],
        completed: ['completed'],
        cancelled: ['cancelled'],
      }
      statusFilter[tab].forEach(s => params.append('status', s))

      const res = await fetch(`/api/bookings?${params}`)
      if (!res.ok) { setError(t('bookings.load_error', lang)); return }
      const data = await res.json()

      setBookings(prev => reset ? (data.data ?? []) : [...prev, ...(data.data ?? [])])
      setHasMore(data.has_more ?? false)
      setCursor(data.next_cursor ?? null)
    } catch {
      setError(t('bookings.load_error', lang))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      setBookings([])
      setCursor(null)
      fetchBookings(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user])

  async function cancelBooking(id: string) {
    if (!confirm(t('bookings.cancel_confirm', lang))) return
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) { alert(t('bookings.cancel_error', lang)); return }
      setBookings(prev => prev.filter(b => b.id !== id))
    } catch {
      alert(t('bookings.cancel_error', lang))
    }
  }

  if (authLoading) return <main style={container}><p>Loading…</p></main>
  if (!user) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: t('bookings.tab_upcoming', lang) },
    { key: 'completed', label: t('bookings.tab_completed', lang) },
    { key: 'cancelled', label: t('bookings.tab_cancelled', lang) },
  ]

  return (
    <main style={container}>
      <h1 style={{ marginBottom: 24 }}>{t('bookings.title', lang)}</h1>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === tb.key ? '2px solid #e91e63' : '2px solid transparent',
              marginBottom: -2,
              fontWeight: tab === tb.key ? 700 : 400,
              color: tab === tb.key ? '#e91e63' : '#555',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>}

      {/* 예약 카드 목록 */}
      {bookings.length === 0 && !loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
          {t('bookings.empty', lang)}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bookings.map(b => (
            <div key={b.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>
                    {b.services?.title ?? '—'}
                  </p>
                  <p style={{ color: '#555', fontSize: '0.875rem', marginBottom: 4 }}>
                    {formatBookingTime(b.booked_at, b.timezone, lang)}
                  </p>
                  {b.profiles?.display_name && (
                    <p style={{ color: '#777', fontSize: '0.8rem' }}>
                      {b.profiles.display_name} · {b.profiles.country}
                    </p>
                  )}
                  {b.notes && (
                    <p style={{ color: '#666', fontSize: '0.8rem', marginTop: 4 }}>
                      {t('host.bookings.notes', lang)}: {b.notes}
                    </p>
                  )}
                </div>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: statusColor(b.status),
                  background: '#f3f4f6',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  {statusLabel(b.status, lang)}
                </span>
              </div>

              {/* 액션 버튼 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <button onClick={() => cancelBooking(b.id)} style={dangerBtn}>
                    {t('bookings.cancel_btn', lang)}
                  </button>
                )}
                {b.status === 'completed' && (
                  <button onClick={() => setReviewBookingId(b.id)} style={secondaryBtn}>
                    {t('bookings.review_btn', lang)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => fetchBookings(false)}
          disabled={loading}
          style={{ ...secondaryBtn, marginTop: 16, display: 'block', margin: '16px auto 0' }}
        >
          {loading ? '…' : t('bookings.load_more', lang)}
        </button>
      )}

      {reviewBookingId && (
        <ReviewForm
          bookingId={reviewBookingId}
          lang={lang}
          onClose={() => setReviewBookingId(null)}
          onSuccess={() => {
            setReviewBookingId(null)
            alert(t('review.success', lang))
          }}
        />
      )}
    </main>
  )
}

const container: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }
const card: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#e91e63', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }
const dangerBtn: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modal: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 420, margin: '1rem' }
