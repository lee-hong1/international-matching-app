import { t, type Lang } from '@/lib/i18n'

type TrustBadgeLevel = 'none' | 'verified' | 'premium' | 'elite'

interface TrustBadgeProps {
  trustScore: number       // 0–100
  trustBadge?: TrustBadgeLevel
  lang?: Lang
  showScore?: boolean
}

const BADGE_ICON: Record<TrustBadgeLevel, string> = {
  none:     '',
  verified: '✓',
  premium:  '⭐',
  elite:    '👑',
}

const BADGE_COLORS: Record<TrustBadgeLevel, { bg: string; color: string }> = {
  none:     { bg: 'transparent', color: 'transparent' },
  verified: { bg: '#dcfce7', color: '#166534' },
  premium:  { bg: '#fef9c3', color: '#854d0e' },
  elite:    { bg: '#ede9fe', color: '#5b21b6' },
}

/** trust_score (0-100) → 별점 개수 (0.0–5.0, 0.5 단위) */
function scoreToStars(score: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  return Math.round((clamped / 100) * 5 * 2) / 2
}

function StarRow({ stars }: { stars: number }) {
  const full  = Math.floor(stars)
  const half  = stars % 1 >= 0.5 ? 1 : 0
  const empty = 5 - full - half

  return (
    <span style={{ display: 'inline-flex', gap: 1 }} aria-hidden="true">
      {'★'.repeat(full)}
      {half === 1 && '½'}
      {'☆'.repeat(empty)}
    </span>
  )
}

export default function TrustBadge({ trustScore, trustBadge = 'none', lang = 'ko', showScore = true }: TrustBadgeProps) {
  const stars = scoreToStars(trustScore)
  const badge = trustBadge ?? 'none'
  const { bg, color } = BADGE_COLORS[badge]
  const icon = BADGE_ICON[badge]

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      aria-label={`trust score ${trustScore}/100`}
    >
      {/* 별점 */}
      {showScore && (
        <span style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
          <StarRow stars={stars} />
        </span>
      )}

      {/* 뱃지 */}
      {badge !== 'none' && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '0.1rem 0.5rem', borderRadius: 99,
            background: bg, color,
            fontSize: '0.78rem', fontWeight: 600,
          }}
          title={t(`profile.${badge}`, lang)}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{t(`profile.${badge}`, lang)}</span>
        </span>
      )}

      {/* 점수 숫자 */}
      {showScore && (
        <span style={{ fontSize: '0.78rem', color: '#888' }}>
          {trustScore}/100
        </span>
      )}
    </span>
  )
}
