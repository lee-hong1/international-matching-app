'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

const COUNTRY_CARDS = [
  { titleKey: 'match.kr_title', descKey: 'match.kr_desc' },
  { titleKey: 'match.jp_title', descKey: 'match.jp_desc' },
  { titleKey: 'match.cn_title', descKey: 'match.cn_desc' },
  { titleKey: 'match.global_title', descKey: 'match.global_desc' },
]

const WHY_CARDS = [
  { titleKey: 'match.w1_title', descKey: 'match.w1_desc' },
  { titleKey: 'match.w2_title', descKey: 'match.w2_desc' },
  { titleKey: 'match.w3_title', descKey: 'match.w3_desc' },
]

const HOW_STEPS: Record<string, { ko: string; en: string; ja: string; zh: string }[]> = {
  ko: [
    { ko: 'Discover 페이지에서 관심 있는 분을 팔로우하세요.', en: '', ja: '', zh: '' },
    { ko: '상대방이 팔로우백하면 <strong>매칭</strong>이 성립됩니다.', en: '', ja: '', zh: '' },
    { ko: '매칭된 분과 1:1 메시지·영상통화가 가능해집니다.', en: '', ja: '', zh: '' },
    { ko: '마음에 드는 호스트와 1:1 데이트 서비스를 예약하세요.', en: '', ja: '', zh: '' },
  ],
  en: [
    { ko: '', en: 'Follow people you\'re interested in from the Discover page.', ja: '', zh: '' },
    { ko: '', en: 'When they follow you back, you become a <strong>Match</strong>.', ja: '', zh: '' },
    { ko: '', en: 'Matches unlock direct messaging and video calls.', ja: '', zh: '' },
    { ko: '', en: 'Book a 1-on-1 date experience with hosts you connect with.', ja: '', zh: '' },
  ],
  ja: [
    { ko: '', en: '', ja: 'Discoverページから気になる方をフォローしましょう。', zh: '' },
    { ko: '', en: '', ja: '相手がフォローバックすると<strong>マッチング</strong>が成立します。', zh: '' },
    { ko: '', en: '', ja: 'マッチング後は1対1メッセージ・ビデオ通話が可能になります。', zh: '' },
    { ko: '', en: '', ja: '気に入ったホストと1対1のデートサービスを予約しましょう。', zh: '' },
  ],
  zh: [
    { ko: '', en: '', ja: '', zh: '在发现页面关注您感兴趣的人。' },
    { ko: '', en: '', ja: '', zh: '当他们回关您时，您就成为了<strong>匹配</strong>。' },
    { ko: '', en: '', ja: '', zh: '匹配后可以直接发消息和视频通话。' },
    { ko: '', en: '', ja: '', zh: '与您连接的主机预约一对一约会体验。' },
  ],
}

const HOW_TITLE: Record<string, string> = {
  ko: '매칭 방법',
  en: 'How Matching Works',
  ja: 'マッチングの仕組み',
  zh: '配对方式',
}

export default function MatchingPage() {
  const { locale: lang } = useLanguage()
  const howSteps = HOW_STEPS[lang] ?? HOW_STEPS['en']
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <Link href="/signup" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">
            {t('static.join_free', lang)}
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('match.title', lang)}</h1>
          <p className="text-lg text-gray-500">{t('match.subtitle', lang)}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {COUNTRY_CARDS.map(card => (
            <div key={card.titleKey} className="p-6 border border-gray-200 rounded-xl hover:border-purple-300 transition-colors">
              <h3 className="font-semibold text-gray-900 text-lg mb-2">{t(card.titleKey, lang)}</h3>
              <p className="text-gray-600 text-sm">{t(card.descKey, lang)}</p>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{HOW_TITLE[lang] ?? HOW_TITLE['en']}</h2>
          <ol className="space-y-3 text-gray-700">
            {howSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-purple-600 font-bold">{i + 1}.</span>
                <span dangerouslySetInnerHTML={{ __html: step[lang] ?? step['en'] }} />
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('match.why_title', lang)}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {WHY_CARDS.map(card => (
              <div key={card.titleKey} className="text-center p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{t(card.titleKey, lang)}</h3>
                <p className="text-sm text-gray-600">{t(card.descKey, lang)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <Link href="/discover" className="inline-block bg-purple-600 text-white font-semibold px-10 py-4 rounded-xl text-lg hover:bg-purple-700 transition-colors">
            {t('match.cta', lang)} 🔍
          </Link>
        </div>
      </main>
    </div>
  )
}
