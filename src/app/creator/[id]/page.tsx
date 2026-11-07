'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'
import { supabase } from '@/lib/supabase'

interface PublicProfile {
  id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  country: string | null
  gender: string | null
  is_premium: boolean | null
}

interface Post {
  id: string
  caption: string | null
  created_at: string
  likes_count: number
  post_media?: Array<{ media_url: string; media_type: string }>
}

interface Service {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  duration_minutes: number
  category: string
}

interface FollowStats {
  followers_count: number
  following_count: number
}

export default function CreatorPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { locale: lang } = useLanguage()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [followStats, setFollowStats] = useState<FollowStats>({ followers_count: 0, following_count: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'services'>('posts')
  const [error, setError] = useState('')

  const loadCreator = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError('')
    try {
      const [profileRes, postsRes, servicesRes, statsRes] = await Promise.all([
        fetch(`/api/profiles/${id}`),
        fetch(`/api/posts?type=user&userId=${id}&limit=12`),
        fetch(`/api/services?host_id=${id}&limit=20`),
        fetch(`/api/follows?userId=${id}&type=stats`),
      ])

      if (!profileRes.ok) {
        setError(profileRes.status === 404 ? t('creator.not_found', lang) : t('error.generic', lang))
        setIsLoading(false)
        return
      }

      const [profileData, postsData, servicesData, statsData] = await Promise.all([
        profileRes.json() as Promise<PublicProfile>,
        postsRes.ok ? postsRes.json() : { posts: [] },
        servicesRes.ok ? servicesRes.json() : { services: [] },
        statsRes.ok ? statsRes.json() : { followers_count: 0, following_count: 0 },
      ])

      setProfile(profileData)
      setPosts((postsData.posts ?? postsData ?? []) as Post[])
      setServices((servicesData.services ?? servicesData ?? []) as Service[])
      setFollowStats({
        followers_count: statsData.followers_count ?? 0,
        following_count: statsData.following_count ?? 0,
      })
    } catch {
      setError(t('error.network', lang))
    } finally {
      setIsLoading(false)
    }
  }, [id, lang])

  useEffect(() => {
    loadCreator()
  }, [loadCreator])

  // Check if current user follows this creator
  useEffect(() => {
    if (!user || !id || user.id === id) return
    supabase
      .from('follows')
      .select('id', { head: true, count: 'exact' })
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .then(({ count }) => setIsFollowing((count ?? 0) > 0))
  }, [user, id])

  async function toggleFollow() {
    if (!user) {
      router.push(`/login?returnUrl=/creator/${id}`)
      return
    }
    setFollowLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      if (isFollowing) {
        await fetch(`/api/follows?following_id=${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        setIsFollowing(false)
        setFollowStats(prev => ({ ...prev, followers_count: Math.max(0, prev.followers_count - 1) }))
      } else {
        await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ following_id: id }),
        })
        setIsFollowing(true)
        setFollowStats(prev => ({ ...prev, followers_count: prev.followers_count + 1 }))
      }
    } catch {
      // best-effort optimistic update already applied
    } finally {
      setFollowLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-600">{error || t('creator.not_found', lang)}</p>
        <Link href="/discover" className="text-purple-600 hover:underline">{t('nav.discover', lang)}</Link>
      </div>
    )
  }

  const displayName = profile.display_name || profile.full_name || '—'
  const isSelf = user?.id === id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <nav className="flex items-center space-x-6">
            <Link href="/discover" className="text-gray-600 hover:text-purple-600">{t('nav.discover', lang)}</Link>
            <Link href="/messages" className="text-gray-600 hover:text-purple-600">{t('nav.messages', lang)}</Link>
            <Link href="/matches" className="text-gray-600 hover:text-purple-600">{t('nav.matching', lang)}</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={96}
                height={96}
                className="rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-3xl flex-shrink-0">
                {displayName.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 truncate">{displayName}</h1>
                {profile.is_premium && (
                  <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Premium</span>
                )}
              </div>
              {profile.country && <p className="text-sm text-gray-500 mb-2">📍 {profile.country}</p>}
              {profile.bio && <p className="text-gray-600 text-sm mb-4 max-w-lg">{profile.bio}</p>}

              {/* 통계 */}
              <div className="flex justify-center sm:justify-start gap-6 mb-4">
                <div className="text-center">
                  <span className="block font-bold text-gray-900">{followStats.followers_count}</span>
                  <span className="text-xs text-gray-500">{t('creator.followers', lang)}</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold text-gray-900">{followStats.following_count}</span>
                  <span className="text-xs text-gray-500">{t('creator.following', lang)}</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold text-gray-900">{posts.length}</span>
                  <span className="text-xs text-gray-500">{t('creator.posts', lang)}</span>
                </div>
              </div>

              {/* 액션 버튼 */}
              {isSelf ? (
                <Link
                  href="/profile/edit"
                  className="inline-block px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('creator.edit_profile', lang)}
                </Link>
              ) : (
                <div className="flex gap-2 justify-center sm:justify-start">
                  <button
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isFollowing
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isFollowing ? t('creator.unfollow', lang) : t('creator.follow', lang)}
                  </button>
                  <Link
                    href={`/messages?partner=${id}`}
                    className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                  >
                    {t('creator.send_message', lang)}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 flex">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('creator.posts', lang)}
            </button>
            {services.length > 0 && (
              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'services'
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('creator.services', lang)}
              </button>
            )}
          </div>

          {/* 게시물 그리드 */}
          {activeTab === 'posts' && (
            <div className="p-4">
              {posts.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-3">📷</div>
                  <p>{t('creator.empty_posts', lang)}</p>
                  {isSelf && (
                    <Link href="/post/create" className="mt-3 inline-block text-purple-600 hover:underline text-sm">
                      {t('creator.first_post', lang)}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((post) => {
                    const media = post.post_media?.[0]
                    return (
                      <Link key={post.id} href={`/post/${post.id}`} className="aspect-square bg-gray-100 overflow-hidden rounded">
                        {media?.media_type === 'image' ? (
                          <Image
                            src={media.media_url}
                            alt={post.caption ?? ''}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs p-2 text-center">
                            {post.caption?.slice(0, 40) ?? ''}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 서비스 목록 */}
          {activeTab === 'services' && (
            <div className="p-4 space-y-3">
              {services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{svc.title}</p>
                    {svc.description && (
                      <p className="text-sm text-gray-500 truncate">{svc.description}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>⏱ {svc.duration_minutes}min</span>
                      <span>💰 {svc.price.toLocaleString()} {svc.currency}</span>
                    </div>
                  </div>
                  <Link
                    href={`/book/${svc.id}?host=${id}`}
                    className="ml-4 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0"
                  >
                    {t('creator.book_service', lang)}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
