'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'
import { supabase } from '@/lib/supabase'

const ALLOWED_COUNTRIES = [
  { code: 'KR', name: '🇰🇷 Korea' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'CN', name: '🇨🇳 China' },
  { code: 'TW', name: '🇹🇼 Taiwan' },
  { code: 'HK', name: '🇭🇰 Hong Kong' },
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'TH', name: '🇹🇭 Thailand' },
  { code: 'VN', name: '🇻🇳 Vietnam' },
  { code: 'PH', name: '🇵🇭 Philippines' },
  { code: 'MY', name: '🇲🇾 Malaysia' },
  { code: 'ID', name: '🇮🇩 Indonesia' },
  { code: 'MN', name: '🇲🇳 Mongolia' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'NZ', name: '🇳🇿 New Zealand' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'SE', name: '🇸🇪 Sweden' },
  { code: 'NO', name: '🇳🇴 Norway' },
  { code: 'DK', name: '🇩🇰 Denmark' },
  { code: 'FI', name: '🇫🇮 Finland' },
  { code: 'CH', name: '🇨🇭 Switzerland' },
  { code: 'AE', name: '🇦🇪 UAE' },
  { code: 'SA', name: '🇸🇦 Saudi Arabia' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'MX', name: '🇲🇽 Mexico' },
]

interface ProfileData {
  display_name: string | null
  bio: string | null
  country: string | null
  city: string | null
  preferred_lang: string | null
  interests: string[] | null
}

export default function ProfileEditPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { locale: lang } = useLanguage()

  const [form, setForm] = useState<ProfileData>({
    display_name: '',
    bio: '',
    country: '',
    city: '',
    preferred_lang: 'ko',
    interests: [],
  })
  const [interestsText, setInterestsText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/profile/edit')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setIsLoading(false); return }
      const data: ProfileData = await res.json()
      setForm({
        display_name: data.display_name ?? '',
        bio: data.bio ?? '',
        country: data.country ?? '',
        city: data.city ?? '',
        preferred_lang: data.preferred_lang ?? 'ko',
        interests: data.interests ?? [],
      })
      setInterestsText((data.interests ?? []).join(', '))
      setIsLoading(false)
    })()
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const parsedInterests = interestsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 30)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setErrorMsg(t('error.generic', lang))
      setIsSaving(false)
      return
    }

    const res = await fetch('/api/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        display_name: form.display_name || undefined,
        bio: form.bio || null,
        country: form.country || undefined,
        city: form.city || null,
        preferred_lang: form.preferred_lang || undefined,
        interests: parsedInterests.length > 0 ? parsedInterests : null,
      }),
    })

    if (res.ok) {
      setSuccessMsg(t('profile.saved', lang))
      setTimeout(() => {
        if (user) router.push(`/creator/${user.id}`)
      }, 1200)
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? t('error.generic', lang))
    }
    setIsSaving(false)
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href={`/creator/${user.id}`} className="text-purple-600 hover:underline text-sm font-medium">
            ← {t('creator.back_to_feed', lang)}
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{t('profile.edit_title', lang)}</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
          {/* 닉네임 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.display_name', lang)}
            </label>
            <input
              type="text"
              value={form.display_name ?? ''}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              maxLength={50}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 자기소개 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.bio', lang)}
            </label>
            <textarea
              value={form.bio ?? ''}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              maxLength={500}
              rows={3}
              placeholder={t('profile.bio_placeholder', lang)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{(form.bio ?? '').length}/500</p>
          </div>

          {/* 국가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.country', lang)}
            </label>
            <select
              value={form.country ?? ''}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{t('profile.select_country', lang)}</option>
              {ALLOWED_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 도시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.city', lang)}
            </label>
            <input
              type="text"
              value={form.city ?? ''}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 언어 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.preferred_lang', lang)}
            </label>
            <select
              value={form.preferred_lang ?? 'ko'}
              onChange={e => setForm(f => ({ ...f, preferred_lang: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>

          {/* 관심사 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.interests', lang)}
            </label>
            <input
              type="text"
              value={interestsText}
              onChange={e => setInterestsText(e.target.value)}
              placeholder="e.g. travel, music, coffee"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {successMsg && (
            <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {isSaving ? t('profile.saving', lang) : t('profile.save', lang)}
          </button>
        </form>
      </main>
    </div>
  )
}
