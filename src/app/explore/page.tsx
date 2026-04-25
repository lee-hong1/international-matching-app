'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { postsService, type Post } from '@/lib/posts'
import { supabase } from '@/lib/supabase'
import FollowButton from '@/components/FollowButton'

interface Creator {
  id: string
  full_name: string | null
  avatar_url: string | null
  country: string | null
  bio: string | null
  creator_profiles?: {
    display_name: string | null
    category: string | null
    followers_count: number
    posts_count: number
  } | null
  is_following?: boolean
}

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'lifestyle', label: '라이프스타일' },
  { key: 'beauty', label: '뷰티' },
  { key: 'travel', label: '여행' },
  { key: 'food', label: '푸드' },
  { key: 'fitness', label: '피트니스' },
  { key: 'fashion', label: '패션' },
  { key: 'art', label: '아트' },
  { key: 'music', label: '음악' },
]

export default function ExplorePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'creators'>('posts')
  const [activeCategory, setActiveCategory] = useState('all')
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    setLoadingData(true)
    if (activeTab === 'posts') {
      postsService.explorePublicPosts(18).then((data) => {
        setPosts(data)
        setLoadingData(false)
      })
    } else {
      loadCreators()
    }
  }, [user, activeTab])

  async function loadCreators() {
    setLoadingData(true)
    const { data } = await supabase
      .from('creator_profiles')
      .select(`
        id,
        profiles!creator_profiles_id_fkey (id, full_name, avatar_url, country, bio),
        display_name, category, followers_count, posts_count
      `)
      .order('followers_count', { ascending: false })
      .limit(20)

    if (!data) { setLoadingData(false); return }

    const formatted: Creator[] = data.map((row: any) => ({
      ...row.profiles,
      creator_profiles: {
        display_name: row.display_name,
        category: row.category,
        followers_count: row.followers_count,
        posts_count: row.posts_count,
      },
    }))

    // 팔로잉 여부
    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', formatted.map((c) => c.id))

      const followingSet = new Set(followData?.map((f) => f.following_id) ?? [])
      formatted.forEach((c) => { c.is_following = followingSet.has(c.id) })
    }

    setCreators(formatted)
    setLoadingData(false)
  }

  const filteredPosts = posts.filter((post) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        post.caption?.toLowerCase().includes(q) ||
        post.profiles?.full_name?.toLowerCase().includes(q) ||
        post.profiles?.creator_profiles?.display_name?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const filteredCreators = creators.filter((creator) => {
    const matchesCategory = activeCategory === 'all' || creator.creator_profiles?.category === activeCategory
    const matchesSearch = !searchQuery || [
      creator.full_name,
      creator.creator_profiles?.display_name,
      creator.country,
    ].some((v) => v?.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-4 py-2 gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'posts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              게시물
            </button>
            <button
              onClick={() => setActiveTab('creators')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'creators' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              크리에이터
            </button>
          </div>
        </div>

        {/* 카테고리 필터 (크리에이터 탭) */}
        {activeTab === 'creators' && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.key
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-0">
        {loadingData ? (
          activeTab === 'posts' ? (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-28 mb-2" />
                    <div className="h-2 bg-gray-100 rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'posts' ? (
          /* 게시물 그리드 */
          filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-gray-400 text-sm">게시물이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {filteredPosts.map((post) => (
                <Link key={post.id} href={`/post/${post.id}`} className="relative aspect-square bg-gray-100 overflow-hidden group block">
                  {post.post_media?.[0] ? (
                    <Image
                      src={post.post_media[0].media_url}
                      alt=""
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-2 text-white text-xs font-semibold">
                      <span>♥ {post.likes_count}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          /* 크리에이터 목록 */
          <div className="p-4 space-y-3">
            {filteredCreators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-gray-400 text-sm">크리에이터가 없습니다</p>
              </div>
            ) : (
              filteredCreators
                .filter((c) => c.id !== user?.id)
                .map((creator) => {
                  const name = creator.creator_profiles?.display_name ?? creator.full_name ?? '사용자'
                  const category = CATEGORIES.find((c) => c.key === creator.creator_profiles?.category)?.label
                  return (
                    <div key={creator.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-50">
                      <Link href={`/creator/${creator.id}`} className="flex-shrink-0">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500">
                          {creator.avatar_url ? (
                            <Image src={creator.avatar_url} alt={name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/creator/${creator.id}`}>
                          <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                          {category && (
                            <span className="text-xs text-pink-500 font-medium">{category}</span>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            팔로워 {(creator.creator_profiles?.followers_count ?? 0).toLocaleString()}명 · 게시물 {creator.creator_profiles?.posts_count ?? 0}
                          </p>
                        </Link>
                      </div>
                      <FollowButton
                        userId={creator.id}
                        initialIsFollowing={creator.is_following ?? false}
                        size="sm"
                      />
                    </div>
                  )
                })
            )}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">홈</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-0.5 text-pink-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <span className="text-xs font-medium">탐색</span>
          </Link>
          <Link href="/discover" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">매칭</span>
          </Link>
          <Link href={`/creator/${user?.id}`} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">프로필</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
