'use client'

import { useState } from 'react'
import { t, type Lang } from '@/lib/i18n'

interface ReviewFormProps {
  bookingId: string
  lang?: Lang
  onSuccess?: () => void
}

export default function ReviewForm({ bookingId, lang = 'ko', onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) return

    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // booking_id는 props에서, reviewer_id는 서버에서 JWT로 추출 (클라이언트 전송 금지)
        body: JSON.stringify({ booking_id: bookingId, rating, comment: comment.trim() || undefined }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'error')
      }

      setMessage({ type: 'success', text: t('review.success', lang) })
      setRating(0)
      setComment('')
      onSuccess?.()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: t('review.error', lang) + (err instanceof Error ? ': ' + err.message : '') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
        {t('review.write', lang)}
      </h3>

      {/* 별점 선택 */}
      <div style={{ display: 'flex', gap: 4 }} role="group" aria-label={t('review.rating', lang)}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.75rem',
              color: star <= (hoverRating || rating) ? '#f59e0b' : '#d1d5db',
              padding: '0 2px',
              lineHeight: 1,
            }}
            aria-label={`${star} star`}
          >
            ★
          </button>
        ))}
      </div>

      {/* 텍스트 입력 */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder={t('review.comment', lang)}
        style={{
          padding: '0.625rem',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          fontSize: '0.9rem',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />

      {message && (
        <div style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 6,
          fontSize: '0.875rem',
          background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        style={{
          padding: '0.625rem 1.25rem',
          background: submitting || rating === 0 ? '#9ca3af' : '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: submitting || rating === 0 ? 'default' : 'pointer',
          fontWeight: 600,
          alignSelf: 'flex-start',
        }}
      >
        {t('review.submit', lang)}
      </button>
    </form>
  )
}
