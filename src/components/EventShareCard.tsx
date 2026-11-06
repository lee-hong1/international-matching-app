'use client'

interface EventShareCardProps {
  eventId: string
  title: string
  date: string
  location: string
  fee: number
  hostName: string
}

export function EventShareCard({ eventId, title, date, location, fee, hostName }: EventShareCardProps) {
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}` : `/events/${eventId}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('링크가 복사되었습니다!')
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
        이벤트 공유
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
        <div>💰 {fee > 0 ? `${fee.toLocaleString('ko-KR')}원/인` : '무료'}</div>
        <div>👤 호스트: {hostName}</div>
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
          복사
        </button>
      </div>
    </div>
  )
}
