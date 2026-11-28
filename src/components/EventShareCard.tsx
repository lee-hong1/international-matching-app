'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

interface EventShareCardProps {
  eventId: string
  title: string
  date: string
  location: string
  fee: number
  hostName: string
}

export function EventShareCard({ eventId, title, date, location, fee, hostName }: EventShareCardProps) {
  const { locale: lang } = useLanguage()
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}` : `/events/${eventId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert(t('event_share.copied', lang))
    } catch {
      // 복사 실패 시 선택 fallback
      const el = document.createElement('input')
      el.value = shareUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
  }

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '1rem',
        background: '#fff',
        marginBottom: '1rem',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
        {t('event_share.title', lang)}
      </p>
      <div
        style={{
          background: '#f9fafb',
          borderRadius: 8,
          padding: '0.75rem',
          marginBottom: '0.75rem',
          fontSize: '0.8rem',
          color: '#6b7280',
          lineHeight: 1.6,
        }}
      >
        <div><strong style={{ color: '#374151' }}>{title}</strong></div>
        <div>📅 {date}</div>
        <div>📍 {location}</div>
        <div>💰 {fee > 0 ? `${fee.toLocaleString()}${t('event_share.fee_per_person', lang)}` : t('event_share.free', lang)}</div>
        <div>👤 {t('event_share.host', lang)} {hostName}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          readOnly
          value={shareUrl}
          style={{
            flex: 1,
            padding: '0.375rem 0.625rem',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            fontSize: '0.75rem',
            color: '#6b7280',
            background: '#f9fafb',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        />
        <button
          onClick={handleCopy}
          style={{
            padding: '0.375rem 0.75rem',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('event_share.copy', lang)}
        </button>
      </div>
    </div>
  )
}
