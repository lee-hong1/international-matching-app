'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { t, type Lang } from '@src/lib/i18n'
import { useAuth } from '@/contexts/AuthContext'

interface Service {
  id: string
  title: string
  description?: string
  duration_minutes: number
  price: number
  currency: string
}

interface AvailabilitySlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  timezone: string
}

type Step = 'service' | 'datetime' | 'notes' | 'confirm' | 'success'

function getLang(): Lang {
  if (typeof window === 'undefined') return 'ko'
  const l = navigator.language.toLowerCase()
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('zh')) return 'zh'
  if (l.startsWith('en')) return 'en'
  return 'ko'
}

function BookingForm({ serviceId }: { serviceId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const lang = getLang()

  const [step, setStep] = useState<Step>('service')
  const [service, setService] = useState<Service | null>(null)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [resolvedHostId, setResolvedHostId] = useState(searchParams.get('host') ?? '')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState('')

  useEffect(() => {
    if (!serviceId) return
    fetch(`/api/services/${serviceId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: (Service & { host_id?: string }) | null) => {
        if (data) {
          setService(data)
          setStep('datetime')
          // fallback: extract host_id from service when not in URL
          if (!resolvedHostId && data.host_id) {
            setResolvedHostId(data.host_id)
          }
        }
      })
      .catch(() => setError(t('error.network', lang)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, lang])

  useEffect(() => {
    if (!resolvedHostId) return
    fetch(`/api/availability?host_id=${resolvedHostId}`)
      .then(r => r.ok ? r.json() : { slots: [] })
      .then(data => setSlots(data.slots ?? []))
      .catch(() => {})
  }, [resolvedHostId])

  const DOW_NAMES: Record<Lang, string[]> = {
    ko: ['일', '월', '화', '수', '목', '금', '토'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ja: ['日', '月', '火', '水', '木', '金', '土'],
    zh: ['日', '一', '二', '三', '四', '五', '六'],
  }

  async function submitBooking() {
    if (!selectedDate || !selectedTime || !service) return
    setLoading(true)
    setError('')
    try {
      const bookedAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString()
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const idempKey = `booking_${serviceId}_${selectedDate}_${selectedTime}`

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempKey,
        },
        body: JSON.stringify({
          host_id: resolvedHostId,
          service_id: service.id,
          booked_at: bookedAt,
          timezone: tz,
          notes: notes || undefined,
        }),
      })

      if (res.status === 409) {
        setError(t('book.slot_taken', lang))
        return
      }
      if (!res.ok) {
        setError(t('error.generic', lang))
        return
      }
      const data = await res.json()
      setBookingId(data.id)
      setStep('success')
    } catch {
      setError(t('error.network', lang))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <main style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ marginBottom: 8 }}>{t('book.success_title', lang)}</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>{t('book.success_body', lang)}</p>
          <button onClick={() => router.push(resolvedHostId ? `/host/${resolvedHostId}` : '/')} style={styles.btn}>
            {t('book.back_to_profile', lang)}
          </button>
        </div>
      </main>
    )
  }

  if (!service && step !== 'service') {
    return (
      <main style={styles.container}>
        <p>{t('book.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main style={styles.container}>
      {/* 서비스 상세 */}
      {service && (
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <h2 style={{ marginBottom: 4 }}>{service.title}</h2>
          {service.description && <p style={{ color: '#555', marginBottom: 8 }}>{service.description}</p>}
          <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', color: '#444' }}>
            <span>⏱ {service.duration_minutes}{lang === 'ko' ? '분' : lang === 'ja' ? '分' : lang === 'zh' ? '分钟' : ' min'}</span>
            <span>💰 {service.price.toLocaleString()} {service.currency}</span>
          </div>
        </div>
      )}

      {/* 날짜/시간 선택 */}
      <div style={styles.card}>
        <h3 style={{ marginBottom: 12 }}>{t('book.select_datetime', lang)}</h3>

        {slots.length > 0 && (
          <div style={{ marginBottom: 12, fontSize: '0.85rem', color: '#555' }}>
            {t('book.available_days', lang)}: {slots.map(s => DOW_NAMES[lang][s.day_of_week]).join(', ')}
          </div>
        )}

        <label style={styles.label}>{t('book.date', lang)}</label>
        <input
          type="date"
          value={selectedDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => setSelectedDate(e.target.value)}
          style={styles.input}
        />

        <label style={{ ...styles.label, marginTop: 12 }}>{t('book.time', lang)}</label>
        <input
          type="time"
          value={selectedTime}
          onChange={e => setSelectedTime(e.target.value)}
          style={styles.input}
        />

        <label style={{ ...styles.label, marginTop: 12 }}>{t('book.notes', lang)}</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t('book.notes_placeholder', lang)}
          maxLength={500}
          rows={3}
          style={{ ...styles.input, resize: 'vertical' }}
        />

        {error && <p style={{ color: '#dc2626', marginTop: 8, fontSize: '0.9rem' }}>{error}</p>}

        <button
          onClick={submitBooking}
          disabled={loading || !selectedDate || !selectedTime}
          style={{ ...styles.btn, marginTop: 16, opacity: loading || !selectedDate || !selectedTime ? 0.6 : 1 }}
        >
          {loading ? t('book.submitting', lang) : t('book.confirm', lang)}
        </button>
      </div>
    </main>
  )
}

const styles = {
  container: { maxWidth: 540, margin: '0 auto', padding: '2rem 1rem' } as React.CSSProperties,
  card: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' } as React.CSSProperties,
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 } as React.CSSProperties,
  input: { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' } as React.CSSProperties,
  btn: { display: 'inline-block', padding: '0.625rem 1.5rem', background: '#e91e63', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '1rem' } as React.CSSProperties,
}

// Suspense 경계: useSearchParams() 필수
export default function BookPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [serviceId, setServiceId] = useState('')

  useEffect(() => { params.then(p => setServiceId(p.serviceId)) }, [params])

  useEffect(() => {
    if (!authLoading && !user && serviceId) {
      router.push(`/login?returnUrl=/book/${serviceId}`)
    }
  }, [user, authLoading, serviceId, router])

  if (authLoading || !serviceId) return null
  if (!user) return null

  return (
    <Suspense fallback={<main style={{ padding: '2rem', textAlign: 'center' }}>Loading...</main>}>
      <BookingForm serviceId={serviceId} />
    </Suspense>
  )
}
