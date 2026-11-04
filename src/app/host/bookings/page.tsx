'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { t, detectLangFromNavigator, type Lang } from '@/lib/i18n'
import { formatBookingTime } from '@/lib/datetime'

interface HostBooking {
  id: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  booked_at: string
  timezone: string
  notes?: string
  services?: { title: string; duration_minutes: number }
  user_name?: string
  user_country?: string
}

function statusColor(status: string): string {
  if (status === 'confirmed') return '#16a34a'
  if (status === 'pending') return '#d97706'
  if (status === 'completed') return '#2563eb'
  return '#6b7280'
}

function statusLabel(status: string, lang: Lang): string {
  const map: Record<string, string> = {
    pending: t('bookings.status_pending', lang),
    confirmed: t('bookings.status_confirmed', lang),
    completed: t('bookings.status_completed', lang),
    cancelled: t('bookings.status_cancelled', lang),
  }
  return map[status] ?? status
}

export default function HostBookingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('ko')
  const [bookings, setBookings] = useState<HostBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { setLang(detectLangFromNavigator()) }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/host/bookings')
    }
  }, [user, authLoading, router])

  async function fetchBookings(reset: boolean) {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '10' })
      if (!reset && cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/bookings/hosted?${params}`)
      if (!res.ok) { setError(t('host.bookings.load_error', lang)); return }
      const data = await res.json()

      setBookings(prev => reset ? (data.data ?? []) : [...prev, ...(data.data ?? [])])
      setHasMore(data.has_more ?? false)
      setCursor(data.next_cursor ?? null)
    } catch {
      setError(t('host.bookings.load_error', lang))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchBookings(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function updateStatus(id: string, status: 'confirmed' | 'completed' | 'cancelled') {
    setActionLoading(id + status)
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { alert(t('host.bookings.status_error', lang)); return }
      setBookings(prev =>
        status === 'cancelled'
          ? prev.filter(b => b.id !== id)
          : prev.map(b => b.id === id ? { ...b, status } : b)
      )
    } catch {
      alert(t('host.bookings.status_error', lang))
    } finally {
      setActionLoading(null)
    }
  }

  if (authLoading) return <main style={container}><p>Loading…</p></main>
  if (!user) return null

  return (
    <main style={container}>
      <h1 style={{ marginBottom: 8 }}>{t('host.bookings_title', lang)}</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>{t('host.bookings_desc', lang)}</p>

      {error && <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>}

      {bookings.length === 0 && !loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
          {t('host.bookings.empty', lang)}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bookings.map(b => {
            const busy = actionLoading?.startsWith(b.id)
            return (
              <div key={b.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>
                      {b.services?.title ?? '—'}
                      {b.services?.duration_minutes && (
                        <span style={{ color: '#777', fontWeight: 400, fontSize: '0.85rem' }}>
                          {' '}· {b.services.duration_minutes}{lang === 'ko' ? '분' : lang === 'ja' ? '分' : ' min'}
                        </span>
                      )}
                    </p>
                    <p style={{ color: '#555', fontSize: '0.875rem', marginBottom: 4 }}>
                      {formatBookingTime(b.booked_at, b.timezone, lang)}
                    </p>
                    {b.user_name && (
                      <p style={{ color: '#777', fontSize: '0.8rem' }}>
                        {t('host.bookings.user_info', lang)}: {b.user_name}
                        {b.user_country ? ` · ${b.user_country}` : ''}
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

                {/* 상태 전환 버튼 */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {b.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(b.id, 'confirmed')}
                      disabled={!!busy}
                      style={{ ...confirmBtn, opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? '…' : t('host.bookings.confirm_btn', lang)}
                    </button>
                  )}
                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(b.id, 'completed')}
                      disabled={!!busy}
                      style={{ ...completeBtn, opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? '…' : t('host.bookings.complete_btn', lang)}
                    </button>
                  )}
                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <button
                      onClick={() => updateStatus(b.id, 'cancelled')}
                      disabled={!!busy}
                      style={{ ...cancelBtn, opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? '…' : t('host.bookings.cancel_btn', lang)}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => fetchBookings(false)}
          disabled={loading}
          style={{ ...secondaryBtn, marginTop: 16, display: 'block', margin: '16px auto 0' }}
        >
          {loading ? '…' : t('host.bookings.load_more', lang)}
        </button>
      )}
    </main>
  )
}

const container: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }
const card: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }
const confirmBtn: React.CSSProperties = { padding: '0.4rem 1rem', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }
const completeBtn: React.CSSProperties = { padding: '0.4rem 1rem', background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }
const cancelBtn: React.CSSProperties = { padding: '0.4rem 1rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { padding: '0.5rem 1.25rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }
