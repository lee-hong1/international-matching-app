'use client'

import { useEffect, useState } from 'react'
import { t, detectLangFromNavigator, type Lang } from '@src/lib/i18n'

const TIMEZONES = [
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

interface AvailabilitySlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  timezone: string
  is_active: boolean
}

export default function HostAvailabilityPage() {
  const [lang, setLang] = useState<Lang>('ko')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '18:00',
    timezone: 'Asia/Seoul',
  })

  useEffect(() => {
    setLang(detectLangFromNavigator())
    fetchSlots()
  }, [])

  async function fetchSlots() {
    setLoading(true)
    try {
      const res = await fetch('/api/availability')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      // silent — slots stays empty
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'error')
      }
      setMessage({ type: 'success', text: t('availability.save_success', lang) })
      await fetchSlots()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: t('availability.save_error', lang) + (err instanceof Error ? ': ' + err.message : '') })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/availability/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })
      if (!res.ok) throw new Error()
      setSlots(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentActive } : s))
    } catch {
      setMessage({ type: 'error', text: t('availability.save_error', lang) })
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/availability/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSlots(prev => prev.filter(s => s.id !== id))
    } catch {
      setMessage({ type: 'error', text: t('availability.save_error', lang) })
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        {t('availability.title', lang)}
      </h1>

      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 8,
          marginBottom: '1rem',
          background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {message.text}
        </div>
      )}

      {/* 슬롯 추가 폼 */}
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem' }}>
            {t('availability.day_of_week', lang)}
            <select
              value={form.day_of_week}
              onChange={e => setForm(f => ({ ...f, day_of_week: Number(e.target.value) }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <option key={d} value={d}>{t(`availability.days.${d}`, lang)}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem' }}>
            {t('availability.start_time', lang)}
            <input
              type="time"
              value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
              required
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem' }}>
            {t('availability.end_time', lang)}
            <input
              type="time"
              value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
              required
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.875rem' }}>
            {t('availability.timezone', lang)}
            <select
              value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.625rem 1.25rem',
            background: submitting ? '#9ca3af' : '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: submitting ? 'default' : 'pointer',
            fontWeight: 600,
            alignSelf: 'flex-start',
          }}
        >
          {t('availability.add_slot', lang)}
        </button>
      </form>

      {/* 현재 슬롯 목록 */}
      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading...</p>
      ) : slots.length === 0 ? (
        <p style={{ color: '#6b7280' }}>{t('availability.no_slots', lang)}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {slots.map(slot => (
            <li
              key={slot.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                background: slot.is_active ? '#f9fafb' : '#f3f4f6',
                borderRadius: 8,
                border: `1px solid ${slot.is_active ? '#e5e7eb' : '#d1d5db'}`,
                opacity: slot.is_active ? 1 : 0.65,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <span style={{
                  fontSize: '0.9rem',
                  textDecoration: slot.is_active ? 'none' : 'line-through',
                  color: slot.is_active ? undefined : '#9ca3af',
                }}>
                  {t(`availability.days.${slot.day_of_week}`, lang)}&nbsp;
                  {slot.start_time} – {slot.end_time}&nbsp;
                  <span style={{ color: slot.is_active ? '#6b7280' : '#d1d5db', fontSize: '0.8rem' }}>({slot.timezone})</span>
                </span>
                {!slot.is_active && (
                  <span style={{
                    fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b',
                    padding: '0.15rem 0.45rem', borderRadius: 3, fontWeight: 600, flexShrink: 0,
                  }}>
                    {t('availability.inactive_badge', lang)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleToggle(slot.id, slot.is_active)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: slot.is_active ? '#fef3c7' : '#d1fae5',
                    color: slot.is_active ? '#92400e' : '#065f46',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {slot.is_active ? t('availability.toggle_off', lang) : t('availability.toggle_on', lang)}
                </button>
                <button
                  onClick={() => handleDelete(slot.id)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  {t('availability.delete', lang)}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
