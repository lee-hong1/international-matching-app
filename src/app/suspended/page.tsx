'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { detectLangFromNavigator } from '@/lib/i18n'

const MESSAGES: Record<string, Record<string, string>> = {
  ko: {
    title: '계정이 임시 정지되었습니다',
    reason: '외부 플랫폼 유도 위반으로 인해 계정이 임시 정지되었습니다.',
    duration: '정지 기간: 7일 (관리자 검토 후 조기 해제 가능)',
    policy: '본 플랫폼은 외부 연락처 공유 및 외부 플랫폼 유도를 금지합니다.',
    appeal: '이의 신청: support@globalmatch.app',
    logout: '로그아웃',
  },
  en: {
    title: 'Your account has been suspended',
    reason: 'Your account has been temporarily suspended for directing to external platforms.',
    duration: 'Suspension period: 7 days (may be lifted early after admin review)',
    policy: 'This platform prohibits sharing external contact information or directing users to external platforms.',
    appeal: 'Appeal: support@globalmatch.app',
    logout: 'Log out',
  },
  ja: {
    title: 'アカウントが一時停止されました',
    reason: '外部プラットフォームへの誘導違反により、アカウントが一時停止されました。',
    duration: '停止期間: 7日間（管理者審査後に早期解除の場合あり）',
    policy: '当プラットフォームは、外部連絡先の共有や外部プラットフォームへの誘導を禁止しています。',
    appeal: 'お問い合わせ: support@globalmatch.app',
    logout: 'ログアウト',
  },
  zh: {
    title: '您的账号已被暂停',
    reason: '由于引导至外部平台的违规行为，您的账号已被暂停。',
    duration: '暂停期限：7天（管理员审核后可提前解除）',
    policy: '本平台禁止分享外部联系方式或引导用户至外部平台。',
    appeal: '申诉邮箱: support@globalmatch.app',
    logout: '退出登录',
  },
}

export default function SuspendedPage() {
  const router = useRouter()
  const rawLang = detectLangFromNavigator()
  const lang = rawLang in MESSAGES ? rawLang : 'en'
  const m = MESSAGES[lang]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">{m.title}</h1>
        <p className="text-gray-600 mb-2">{m.reason}</p>
        <p className="text-sm font-medium text-orange-600 mb-2">{m.duration}</p>
        <p className="text-sm text-gray-500 mb-6">{m.policy}</p>

        <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-6 text-sm text-gray-700">
          {m.appeal}
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 transition-colors"
        >
          {m.logout}
        </button>
      </div>
    </div>
  )
}
