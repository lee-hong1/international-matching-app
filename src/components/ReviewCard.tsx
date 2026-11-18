'use client'

import { formatRelativeTime } from '@src/lib/datetime'
import { t, type Lang } from '@src/lib/i18n'

interface ReviewCardProps {
  review: {
    id: string
    rating: number
    comment?: string | null
    is_public: boolean
    created_at: string
    reviewer?: {
      display_name?: string | null
      country?: string | null
    } | null
  }
  lang?: Lang
}

function StarRating({ rating }: { rating: number }) {
  const safeRating = isNaN(rating) ? 1 : Math.max(1, Math.min(5, Math.round(rating)))
  return (
    <span aria-label={`${safeRating} out of 5 stars`} style={{ color: '#f59e0b', letterSpacing: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < safeRating ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  )
}

export default function ReviewCard({ review, lang = 'ko' }: ReviewCardProps) {
  if (!review.is_public) {
    return (
      <div style={{
        padding: '0.75rem 1rem',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: '#f9fafb',
        color: '#9ca3af',
        fontSize: '0.875rem',
        fontStyle: 'italic',
      }}>
        {t('review.private', lang)}
      </div>
    )
  }

  return (
    <div style={{
      padding: '1rem',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <StarRating rating={review.rating} />
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          {review.reviewer?.display_name ?? '—'}
          {review.reviewer?.country ? ` · ${review.reviewer.country}` : ''}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
          {formatRelativeTime(review.created_at, lang)}
        </span>
      </div>
      {review.comment && (
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', lineHeight: 1.6 }}>
          {review.comment}
        </p>
      )}
    </div>
  )
}
