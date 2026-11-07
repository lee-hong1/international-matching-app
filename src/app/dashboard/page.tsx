'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  followers: number
  following: number
  chatRooms: number
  events: number
}

interface Notification {
  id: string
  type: string
  title: string
  created_at: string
}

function relativeTime(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return lang === 'ko' ? '방금 전' : lang === 'ja' ? 'たった今' : lang === 'zh' ? '刚刚' : 'just now'
  if (mins < 60) return lang === 'ko' ? `${mins}분 전` : lang === 'ja' ? `${mins}分前` : lang === 'zh' ? `${mins}分钟前` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === 'ko' ? `${hours}시간 전` : lang === 'ja' ? `${hours}時間前` : lang === 'zh' ? `${hours}小时前` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return lang === 'ko' ? `${days}일 전` : lang === 'ja' ? `${days}日前` : lang === 'zh' ? `${days}天前` : `${days}d ago`
}

const NOTIFICATION_DOT_COLOR: Record<string, string> = {
  match: 'bg-green-400',
  message: 'bg-blue-400',
  like: 'bg-pink-400',
  profile_view: 'bg-purple-400',
  system: 'bg-gray-400',
}

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { locale: lang } = useLanguage()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [notifications, setNotifications] = useState<Notification[] | null>(null)
  const [completion, setCompletion] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const [profileRes, chatRes, eventRes, profileFieldsRes, notifRes] = await Promise.all([
        supabase
          .from('creator_profiles')
          .select('followers_count, following_count')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('chat_rooms')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${user.id},host_id.eq.${user.id}`),
        supabase
          .from('event_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('display_name, avatar_url, bio, country, gender, is_adult')
          .eq('id', user.id)
          .single(),
        supabase
          .from('notifications')
          .select('id, type, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ])
      setStats({
        followers: profileRes.data?.followers_count ?? 0,
        following: profileRes.data?.following_count ?? 0,
        chatRooms: chatRes.count ?? 0,
        events: eventRes.count ?? 0,
      })
      setNotifications(notifRes.data ?? [])
      const pf = profileFieldsRes.data
      if (pf) {
        const filled = [pf.display_name, pf.avatar_url, pf.bio, pf.country, pf.gender, pf.is_adult].filter(Boolean).length
        setCompletion(Math.round((filled / 6) * 100))
      } else {
        setCompletion(0)
      }
    })()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = user.user_metadata?.full_name || user.email || ''

  const statValue = (n: number | undefined) =>
    stats === null ? '—' : String(n ?? 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-purple-600">
                💕 GlobalMatch
              </Link>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-purple-600 font-medium">{t('nav.dashboard', lang)}</Link>
              <Link href="/feed" className="text-gray-600 hover:text-purple-600">{t('nav.feed', lang)}</Link>
              <Link href="/explore" className="text-gray-600 hover:text-purple-600">{t('nav.explore', lang)}</Link>
              <Link href="/discover" className="text-gray-600 hover:text-purple-600">{t('nav.discover', lang)}</Link>
              <Link href="/messages" className="text-gray-600 hover:text-purple-600">{t('nav.messages', lang)}</Link>
              <Link href={`/creator/${user?.id ?? ''}`} className="text-gray-600 hover:text-purple-600">{t('nav.my_channel', lang)}</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title', lang)}</h1>
          <p className="text-gray-600">{t('dashboard.greeting', lang, { name: displayName })}</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t('dashboard.stat_views', lang)}</p>
                <p className="text-2xl font-semibold text-gray-900">{statValue(stats?.followers)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t('dashboard.stat_likes', lang)}</p>
                <p className="text-2xl font-semibold text-gray-900">{statValue(stats?.following)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t('dashboard.stat_messages', lang)}</p>
                <p className="text-2xl font-semibold text-gray-900">{statValue(stats?.chatRooms)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{t('dashboard.stat_matches', lang)}</p>
                <p className="text-2xl font-semibold text-gray-900">{statValue(stats?.events)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 탐색 CTA */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.recent_matches', lang)}</h2>
              <Link href="/discover" className="text-purple-600 hover:text-purple-500 text-sm font-medium">
                {t('dashboard.view_all', lang)}
              </Link>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm mb-4">{t('dashboard.no_matches_yet', lang)}</p>
              <Link
                href="/discover"
                className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                {t('dashboard.explore_cta', lang)}
              </Link>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('dashboard.recent_activity', lang)}</h2>
            <div className="space-y-4">
              {notifications === null ? (
                <p className="text-gray-400 text-sm">—</p>
              ) : notifications.length === 0 ? (
                <p className="text-gray-400 text-sm">{t('dashboard.no_notifications', lang)}</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${NOTIFICATION_DOT_COLOR[n.type] ?? 'bg-gray-400'}`}></div>
                    <div>
                      <p className="text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-600">{relativeTime(n.created_at, lang)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 프로필 완성도 */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.profile_completion', lang)}</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="bg-white bg-opacity-20 rounded-full h-3">
                <div className="bg-white rounded-full h-3" style={{ width: `${completion ?? 0}%` }}></div>
              </div>
            </div>
            <span className="text-lg font-semibold">{completion === null ? '—' : `${completion}%`}</span>
          </div>
          <p className="mt-4 text-white text-opacity-90">
            {t('dashboard.completion_cta', lang)}
          </p>
          <Link href="/profile/edit" className="inline-block mt-4 bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100">
            {t('dashboard.complete_profile', lang)}
          </Link>
        </div>
      </main>
    </div>
  )
}
