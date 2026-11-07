'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

interface MatchProfile {
  id: string
  full_name: string
  avatar_url: string | null
  country: string | null
  creator_profiles?: { display_name?: string; category?: string } | null
}

export default function MatchesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { locale: lang } = useLanguage()
  const [matches, setMatches] = useState<MatchProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?returnUrl=/matches')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    loadMatches()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function loadMatches() {
    if (!user) return
    setIsLoading(true)
    setError('')
    try {
      // Fetch both following and followers in parallel
      const [followingRes, followersRes] = await Promise.all([
        fetch(`/api/follows?userId=${user.id}&type=following`),
        fetch(`/api/follows?userId=${user.id}&type=followers`),
      ])

      if (!followingRes.ok || !followersRes.ok) {
        setError(t('error.generic', lang))
        return
      }

      const [followingData, followersData] = await Promise.all([
        followingRes.json() as Promise<{ users: MatchProfile[] }>,
        followersRes.json() as Promise<{ users: MatchProfile[] }>,
      ])

      const followingIds = new Set((followingData.users ?? []).map((u: MatchProfile) => u.id))

      // Mutual follows = followers who I also follow
      const mutual = (followersData.users ?? []).filter((u: MatchProfile) => followingIds.has(u.id))
      setMatches(mutual)
    } catch {
      setError(t('error.network', lang))
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-2xl font-bold text-purple-600">
              💕 GlobalMatch
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-purple-600">{t('nav.dashboard', lang)}</Link>
              <Link href="/discover" className="text-gray-600 hover:text-purple-600">{t('nav.discover', lang)}</Link>
              <span className="text-purple-600 font-medium">{t('nav.matching', lang)}</span>
              <Link href="/messages" className="text-gray-600 hover:text-purple-600">{t('nav.messages', lang)}</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('matches.title', lang)}</h1>
          <p className="text-gray-500 mt-1 text-sm">{t('matches.subtitle', lang)}</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-5xl mb-4">💝</div>
            <p className="text-gray-600 mb-6">{t('matches.empty', lang)}</p>
            <Link
              href="/discover"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              {t('matches.empty_cta', lang)}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <div key={match.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 flex items-center space-x-3">
                  {match.avatar_url ? (
                    <Image
                      src={match.avatar_url}
                      alt={match.full_name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg">
                      {match.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{match.full_name}</p>
                    {match.country && (
                      <p className="text-xs text-gray-500">📍 {match.country}</p>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-4 flex gap-2">
                  <Link
                    href={`/messages?partner=${match.id}`}
                    className="flex-1 text-center py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {t('matches.send_message', lang)}
                  </Link>
                  <Link
                    href={`/host/${match.id}`}
                    className="flex-1 text-center py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t('matches.view_profile', lang)}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
