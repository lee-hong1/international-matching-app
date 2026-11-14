'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { type Locale } from '@/lib/i18n'

interface EventShareCardProps {
  eventId: string
  title: string
  date: string
  location: string
  fee: number
  hostName: string
  isHost?: boolean
  isFeatured?: boolean
}

function generatePromoText(
  locale: Locale,
  title: string,
  date: string,
  location: string,
  fee: number,
  host: string,
  url: string,
): string {
  const feeStr = fee > 0 ? fee.toLocaleString() : null
  switch (locale) {
    case 'zh':
      return `🎉 活动招募中！\n\n📌 ${title}\n📅 ${date}\n📍 ${location}\n👤 主办：${host}\n${feeStr ? `💰 参加费：${feeStr}韩元\n` : '🎁 免费参加\n'}\n👉 ${url}\n\n快来一起参加吧！`
    case 'ja':
      return `🎉 イベント募集中！\n\n📌 ${title}\n📅 ${date}\n📍 ${location}\n👤 ホスト：${host}\n${feeStr ? `💰 参加費：${feeStr}ウォン\n` : '🎁 無料参加\n'}\n👉 ${url}\n\nぜひ一緒に楽しみましょう！`
    case 'en':
      return `🎉 Event Now Open!\n\n📌 ${title}\n📅 ${date}\n📍 ${location}\n👤 Host: ${host}\n${feeStr ? `💰 Fee: ₩${feeStr}\n` : '🎁 Free to join\n'}\n👉 ${url}\n\nJoin us for a great time!`
    default:
      return `🎉 모임 모집 중!\n\n📌 ${title}\n📅 ${date}\n📍 ${location}\n👤 호스트: ${host}\n${feeStr ? `💰 참가비: ${feeStr}원\n` : '🎁 무료 참가\n'}\n👉 ${url}\n\n함께해요!`
  }
}

type CopiedKey = 'text' | 'kakao' | 'wechat' | 'instagram' | null

export function EventShareCard({
  eventId, title, date, location, fee, hostName, isHost = false, isFeatured = false,
}: EventShareCardProps) {
  const { locale, t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<CopiedKey>(null)

  const eventUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${eventId}`
    : `/events/${eventId}`

  const promoText = generatePromoText(locale, title, date, location, fee, hostName, eventUrl)

  async function copyText(text: string, key: CopiedKey) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  function shareTwitter() {
    const encoded = encodeURIComponent(`${promoText}\n${eventUrl}`)
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank')
  }

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, '_blank')
  }

  function shareLine() {
    const encoded = encodeURIComponent(`${promoText}\n${eventUrl}`)
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(eventUrl)}&text=${encoded}`, '_blank')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          {isFeatured && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
              ★ {t('share_featured_badge')}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-800">{t('share_title')}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Promo text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-500 font-medium">{t('share_text_label')}</p>
              <button
                onClick={() => copyText(promoText, 'text')}
                className="text-xs text-pink-500 font-semibold"
              >
                {copied === 'text' ? t('share_copied') : t('share_copy')}
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 whitespace-pre-line leading-relaxed">
              {promoText}
            </div>
          </div>

          {/* SNS buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => copyText(`${promoText}\n${eventUrl}`, 'kakao')}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs font-semibold"
            >
              <span className="text-lg">💬</span>
              {copied === 'kakao' ? t('share_copied') : t('share_kakao')}
            </button>

            <button
              onClick={shareLine}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold"
            >
              <span className="text-lg">📱</span>
              {t('share_line')}
            </button>

            <button
              onClick={shareTwitter}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold"
            >
              <span className="text-lg">𝕏</span>
              {t('share_twitter')}
            </button>

            <button
              onClick={shareFacebook}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <span className="text-lg">f</span>
              {t('share_facebook')}
            </button>

            <button
              onClick={() => copyText(`${promoText}\n${eventUrl}`, 'wechat')}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
            >
              <span className="text-lg">💚</span>
              {copied === 'wechat' ? t('share_copied') : t('share_wechat_copy')}
            </button>

            <button
              onClick={() => copyText(`${promoText}\n${eventUrl}`, 'instagram')}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white text-xs font-semibold"
            >
              <span className="text-lg">📸</span>
              {copied === 'instagram' ? t('share_copied') : t('share_instagram')}
            </button>
          </div>

          {/* Boost section - host only */}
          {isHost && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t('share_boost')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('share_boost_desc')}</p>
                </div>
                <button
                  onClick={() => alert('부스트 결제 기능은 곧 오픈됩니다!')}
                  className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold rounded-xl"
                >
                  {t('share_boost_btn')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
