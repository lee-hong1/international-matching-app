'use client'

import { useEffect, useState } from 'react'
import { t, type Lang } from '@src/lib/i18n'

interface Service {
  id: string
  title: string
  description?: string
  duration_minutes: number
  price: number
  currency: string
  category: string
  is_active: boolean
}

type Category = 'conversation' | 'lesson' | 'tour' | 'meal' | 'activity' | 'other'
const CATEGORIES: Category[] = ['conversation', 'lesson', 'tour', 'meal', 'activity', 'other']

function getLang(): Lang {
  if (typeof window === 'undefined') return 'ko'
  const l = navigator.language.toLowerCase()
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('zh')) return 'zh'
  if (l.startsWith('en')) return 'en'
  return 'ko'
}

export default function HostServicesPage() {
  const lang = getLang()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', duration_minutes: 60, price: 0, currency: 'KRW', category: 'conversation' as Category })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadServices() {
    setLoading(true)
    try {
      const res = await fetch('/api/services?host_id=me')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services ?? data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadServices() }, [])

  async function submitForm() {
    setSubmitting(true)
    setError('')
    try {
      const url = editId ? `/api/services/${editId}` : '/api/services'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? t('error.generic', lang))
        return
      }
      setShowForm(false)
      setEditId(null)
      setForm({ title: '', description: '', duration_minutes: 60, price: 0, currency: 'KRW', category: 'conversation' })
      await loadServices()
    } catch {
      setError(t('error.network', lang))
    } finally {
      setSubmitting(false)
    }
  }

  async function deactivate(id: string) {
    if (!confirm(t('host.services_deactivate_confirm', lang))) return
    await fetch(`/api/services/${id}`, { method: 'DELETE' })
    await loadServices()
  }

  function startEdit(s: Service) {
    setForm({ title: s.title, description: s.description ?? '', duration_minutes: s.duration_minutes, price: s.price, currency: s.currency, category: s.category as Category })
    setEditId(s.id)
    setShowForm(true)
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>{t('host.services_title', lang)}</h1>
        <button onClick={() => { setEditId(null); setForm({ title: '', description: '', duration_minutes: 60, price: 0, currency: 'KRW', category: 'conversation' }); setShowForm(true) }} style={styles.btnPrimary}>
          + {t('host.services_add', lang)}
        </button>
      </div>

      {/* 생성/수정 폼 */}
      {showForm && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: 12 }}>{editId ? t('host.services_edit', lang) : t('host.services_add', lang)}</h3>
          <Field label={t('host.services_field_title', lang)}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={100} style={styles.input} />
          </Field>
          <Field label={t('host.services_field_desc', lang)}>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...styles.input, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label={t('host.services_field_duration', lang)}>
              <input type="number" value={form.duration_minutes} min={15} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} style={styles.input} />
            </Field>
            <Field label={t('host.services_field_price', lang)}>
              <input type="number" value={form.price} min={0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} style={styles.input} />
            </Field>
          </div>
          <Field label={t('host.services_field_currency', lang)}>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={styles.input}>
              {['KRW', 'JPY', 'CNY', 'USD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={t('host.services_field_category', lang)}>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} style={styles.input}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={submitForm} disabled={submitting || !form.title} style={{ ...styles.btnPrimary, opacity: submitting || !form.title ? 0.6 : 1 }}>
              {submitting ? '...' : t('host.services_save', lang)}
            </button>
            <button onClick={() => setShowForm(false)} style={styles.btnSecondary}>{t('book.cancel', lang)}</button>
          </div>
        </div>
      )}

      {/* 서비스 목록 */}
      {loading ? (
        <p style={{ color: '#888' }}>{t('book.loading', lang)}</p>
      ) : services.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>{t('host.services_empty', lang)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map(s => (
            <div key={s.id} style={{ ...styles.card, opacity: s.is_active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#555' }}>
                    {s.duration_minutes}min · {s.price.toLocaleString()} {s.currency} · {s.category}
                  </div>
                  {!s.is_active && <span style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>{t('host.services_inactive', lang)}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => startEdit(s)} style={styles.btnSmall}>{t('host.services_edit', lang)}</button>
                  {s.is_active && <button onClick={() => deactivate(s.id)} style={{ ...styles.btnSmall, background: '#fee2e2', color: '#dc2626' }}>{t('host.services_deactivate', lang)}</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  )
}

const styles = {
  card: { border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: 0 } as React.CSSProperties,
  input: { width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.95rem', boxSizing: 'border-box' } as React.CSSProperties,
  btnPrimary: { padding: '0.5rem 1rem', background: '#e91e63', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  btnSecondary: { padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer' } as React.CSSProperties,
  btnSmall: { padding: '0.3rem 0.6rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer' } as React.CSSProperties,
}
