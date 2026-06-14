'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { postsService, type Post } from '@/lib/posts'
import { followsService, type FollowStats } from '@/lib/follows'
import { supabase } from '@/lib/supabase'
import FollowButton from '@/components/FollowButton'
import CreatePost from '@/components/CreatePost'

interface CreatorProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  country: string | null
  interests: string[] | null
  verification_status: string
  creator_profiles?: {
    display_name: string | null
    category: string | null
    website_url: string | null
    posts_count: number
    followers_count: number
    following_count: number
  } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  lifestyle: '라이프스타일',
  beauty: '뷰티',
  travel: '여행',
  food: '푸드',
  fitness: '피트니스',
  fashion: '패션',
  art: '아트',
  music: '음악',
  other: '기타',
}

export default function CreatorProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [followStats, setFollowStats] = useState<FollowStats>({ followers_count: 0, following_count: 0, is_following: false })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [tab, setTab] = useState<'posts' | 'info'>('posts')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const isOwner = user?.id === userId

  useEffect(() => {
    if (!userId) return

    async function loadData() {
      setLoadingProfile(true)
      const { data } = await supabase
        .from('profiles')
        .select(`
          id, full_name, avatar_url, bio, country, interests, verification_status,
          creator_profiles (display_name, category, website_url, posts_count, followers_count, following_count)
        `)
        .eq('id', userId)
        .single()

      if (data) setProfile(data as CreatorProfile)
      setLoadingProfile(false)

      const stats = await followsService.getFollowStats(userId)
      setFollowStats(stats)

      setLoadingPosts(true)
      const userPosts = await postsService.getUserPosts(userId)
      setPosts(userPosts)
      setLoadingPosts(false)
    }

    loadData()
  }, [userId])

  function handleFollowChange(isFollowing: boolean) {
    setFollowStats((prev) => ({
      ...prev,
      is_following: isFollowing,
      followers_count: isFollowing ? prev.followers_count + 1 : Math.max(prev.followers_count - 1, 0),
    }))
  }

  function handlePostCreated(post: Post) {
    setPosts((prev) => [post, ...prev])
    setShowCreatePost(false)
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">프로필을 찾을 수 없습니다</p>
        <Link href="/feed" className="text-pink-500 font-semibold">피드로 돌아가기</Link>
      </div>
    )
  }

  const displayName = profile.creator_profiles?.display_name ?? profile.full_name ?? '사용자'
  const category = profile.creator_profiles?.category
  const postsCount = profile.creator_profiles?.posts_count ?? posts.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold text-gray-900 flex-1">{displayName}</h1>
          {isOwner && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* 프로필 헤더 */}
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="flex items-start gap-5 mb-4">
            {/* 아바타 */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0 ring-2 ring-pink-100">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={displayName} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {profile.verification_status === 'verified' && (
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* 통계 */}
            <div className="flex-1 flex justify-around pt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{postsCount.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">게시물</p>
              </div>
              <div className="text-center cursor-pointer hover:opacity-70">
                <p className="text-xl font-bold text-gray-900">{followStats.followers_count.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">팔로워</p>
              </div>
              <div className="text-center cursor-pointer hover:opacity-70">
                <p className="text-xl font-bold text-gray-900">{followStats.following_count.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">팔로잉</p>
              </div>
            </div>
          </div>

          {/* 이름 & 카테고리 */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">{displayName}</h2>
              {category && (
                <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                  {CATEGORY_LABELS[category] ?? category}
                </span>
              )}
            </div>
            {profile.country && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {profile.country}
              </p>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{profile.bio}</p>
          )}

          {profile.creator_profiles?.website_url && (
            <a
              href={profile.creator_profiles.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-3"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {profile.creator_profiles.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}

          {/* 관심사 태그 */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {profile.interests.slice(0, 6).map((interest) => (
                <span key={interest} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  #{interest}
                </span>
              ))}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-2 mt-3">
            {isOwner ? (
              <>
                <Link
                  href="/profile/edit"
                  className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl text-center hover:bg-gray-50"
                >
                  프로필 편집
                </Link>
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700"
                >
                  게시물 추가
                </button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <FollowButton
                    userId={userId}
                    initialIsFollowing={followStats.is_following}
                    onFollowChange={handleFollowChange}
                    size="md"
                  />
                </div>
                <Link
                  href="/messages"
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 text-center"
                >
                  메시지
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="bg-white border-b border-gray-100 flex sticky top-14 z-30">
          <button
            onClick={() => setTab('posts')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'posts' ? 'border-pink-500 text-pink-500' : 'border-transparent text-gray-500'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              게시물
            </div>
          </button>
          <button
            onClick={() => setTab('info')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'info' ? 'border-pink-500 text-pink-500' : 'border-transparent text-gray-500'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              정보
            </div>
          </button>
        </div>

        {/* 게시물 그리드 */}
        {tab === 'posts' && (
          <>
            {loadingPosts ? (
              <div className="grid grid-cols-3 gap-0.5 p-0.5">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-700 mb-1">아직 게시물이 없습니다</p>
                {isOwner && (
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="mt-3 text-sm text-pink-500 font-semibold"
                  >
                    첫 게시물 올리기
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="relative aspect-square bg-gray-100 overflow-hidden group"
                  >
                    {post.post_media?.[0] ? (
                      <Image
                        src={post.post_media[0].media_url}
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                        </svg>
                      </div>
                    )}
                    {/* 다중 사진 표시 */}
                    {post.post_media && post.post_media.length > 1 && (
                      <div className="absolute top-1.5 right-1.5 bg-black/50 rounded-sm p-0.5">
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 0v12h12V6H4zM0 10a2 2 0 012-2v8a2 2 0 002 2H8a2 2 0 01-2 2H2a2 2 0 01-2-2v-8zm0-4a2 2 0 012-2h8a2 2 0 012 2v2H2a2 2 0 01-2-2v0z" />
                        </svg>
                      </div>
                    )}
                    {/* 호버 오버레이 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-3 text-white text-sm font-semibold">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          {post.comments_count}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* 정보 탭 */}
        {tab === 'info' && (
          <div className="bg-white p-6 space-y-4">
            {profile.bio && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">소개</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {profile.country && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">거주지</h3>
                <p className="text-sm text-gray-700">{profile.country}</p>
              </div>
            )}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">관심사</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span key={interest} className="text-sm bg-gradient-to-r from-pink-50 to-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100">
                      #{interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 게시물 상세 모달 */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">게시물</h3>
                <button onClick={() => setSelectedPost(null)} className="p-1 text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedPost.post_media?.[0] && (
                <div className="aspect-square relative bg-black">
                  <Image src={selectedPost.post_media[0].media_url} alt="" fill className="object-cover" />
                </div>
              )}
              <div className="p-4">
                {selectedPost.caption && (
                  <p className="text-sm text-gray-700 mb-2">{selectedPost.caption}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {selectedPost.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {selectedPost.comments_count}
                  </span>
                </div>
                <Link
                  href={`/post/${selectedPost.id}`}
                  className="mt-3 block text-center text-sm text-pink-500 font-semibold"
                >
                  자세히 보기
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  )
}
