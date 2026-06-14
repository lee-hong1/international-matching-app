'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { postsService, type Post } from '@/lib/posts'
import PostCard from '@/components/PostCard'
import StoryBar from '@/components/StoryBar'
import CreatePost from '@/components/CreatePost'
import CreateStory from '@/components/CreateStory'

export default function FeedPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const LIMIT = 10

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  const loadPosts = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    setLoadingPosts(true)
    try {
      const data = await postsService.getFeed(LIMIT, currentOffset)
      if (reset) {
        setPosts(data)
      } else {
        setPosts((prev) => [...prev, ...data])
      }
      setHasMore(data.length === LIMIT)
      setOffset(currentOffset + data.length)
    } finally {
      setLoadingPosts(false)
    }
  }, [offset])

  useEffect(() => {
    if (user) loadPosts(true)
  }, [user])

  function handlePostCreated(post: Post) {
    setPosts((prev) => [post, ...prev])
    setShowCreatePost(false)
  }

  function handlePostDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            FanWorld
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreatePost(true)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-700"
              title="새 게시물"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <Link href="/messages" className="p-2 rounded-full hover:bg-gray-100 text-gray-700" title="메시지">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* 스토리 바 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <StoryBar onAddStory={() => setShowCreateStory(true)} />
        </div>

        {/* 피드 */}
        {loadingPosts && posts.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-1.5" />
                    <div className="h-2 bg-gray-100 rounded w-16" />
                  </div>
                </div>
                <div className="aspect-square bg-gray-200" />
                <div className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">아직 피드가 비어있습니다</h3>
            <p className="text-sm text-gray-500 mb-4">크리에이터를 팔로우하거나 첫 게시물을 올려보세요!</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/explore"
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl"
              >
                크리에이터 탐색
              </Link>
              <button
                onClick={() => setShowCreatePost(true)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50"
              >
                게시물 올리기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onPostDeleted={handlePostDeleted}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => loadPosts(false)}
                  disabled={loadingPosts}
                  className="px-6 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingPosts ? '불러오는 중...' : '더 보기'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 text-pink-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-xs font-medium">홈</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs">탐색</span>
          </Link>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
          <Link href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">모임</span>
          </Link>
          <Link href="/discover" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">매칭</span>
          </Link>
          <Link href={`/creator/${user?.id}`} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-semibold">
                  {(user?.user_metadata?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs">프로필</span>
          </Link>
        </div>
      </nav>

      {/* 모달 */}
      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
      {showCreateStory && (
        <CreateStory
          onClose={() => setShowCreateStory(false)}
          onStoryCreated={() => setShowCreateStory(false)}
        />
      )}
    </div>
  )
}
