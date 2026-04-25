'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { postsService, type Post, type PostComment } from '@/lib/posts'
import { followsService } from '@/lib/follows'
import FollowButton from '@/components/FollowButton'
import { formatDistanceToNow } from '@/lib/dateUtils'

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const { user } = useAuth()
  const router = useRouter()

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [loadingPost, setLoadingPost] = useState(true)
  const [loadingComments, setLoadingComments] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [mediaIndex, setMediaIndex] = useState(0)
  const [comment, setComment] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    if (!postId) return
    async function load() {
      setLoadingPost(true)
      const data = await postsService.getPost(postId)
      if (data) {
        setPost(data)
        setIsLiked(data.is_liked ?? false)
        setLikesCount(data.likes_count)
      }
      setLoadingPost(false)

      setLoadingComments(true)
      const cmts = await postsService.getComments(postId)
      setComments(cmts)
      setLoadingComments(false)
    }
    load()
  }, [postId])

  useEffect(() => {
    if (!post || !user || user.id === post.user_id) return
    followsService.isFollowing(post.user_id).then(setIsFollowing)
  }, [post, user])

  async function handleLike() {
    if (!post) return
    if (isLiked) {
      await postsService.unlikePost(post.id)
      setIsLiked(false)
      setLikesCount((c) => Math.max(c - 1, 0))
    } else {
      await postsService.likePost(post.id)
      setIsLiked(true)
      setLikesCount((c) => c + 1)
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!post || !comment.trim()) return
    const { comment: newComment } = await postsService.addComment(post.id, comment.trim())
    if (newComment) {
      setComments((prev) => [...prev, newComment])
      setComment('')
    }
  }

  async function handleDeleteComment(commentId: string) {
    const { error } = await postsService.deleteComment(commentId)
    if (!error) setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  if (loadingPost) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">게시물을 찾을 수 없습니다</p>
        <button onClick={() => router.back()} className="text-pink-500 font-semibold">돌아가기</button>
      </div>
    )
  }

  const profile = post.profiles
  const displayName = profile?.creator_profiles?.display_name ?? profile?.full_name ?? '사용자'
  const media = post.post_media ?? []

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
          <h1 className="font-semibold text-gray-900 flex-1">게시물</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        <article className="bg-white">
          {/* 게시물 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <Link href={`/creator/${profile?.id}`} className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500">
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt={displayName} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
                {post.location && (
                  <p className="text-xs text-gray-500">{post.location}</p>
                )}
              </div>
            </Link>
            {user && user.id !== post.user_id && (
              <FollowButton
                userId={post.user_id}
                initialIsFollowing={isFollowing}
                onFollowChange={setIsFollowing}
                size="sm"
              />
            )}
          </div>

          {/* 미디어 */}
          {media.length > 0 && (
            <div className="relative bg-black aspect-square">
              <Image
                src={media[mediaIndex].media_url}
                alt="게시물"
                fill
                className="object-cover"
                priority
              />
              {media.length > 1 && (
                <>
                  {mediaIndex > 0 && (
                    <button
                      onClick={() => setMediaIndex((i) => i - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-9 h-9 flex items-center justify-center backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {mediaIndex < media.length - 1 && (
                    <button
                      onClick={() => setMediaIndex((i) => i + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-9 h-9 flex items-center justify-center backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {media.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setMediaIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${i === mediaIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 액션 바 */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={handleLike}
                className={`transition-transform active:scale-110 ${isLiked ? 'text-red-500' : 'text-gray-600'}`}
              >
                <svg className="w-7 h-7" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>

            {likesCount > 0 && (
              <p className="text-sm font-semibold text-gray-900 mb-2">좋아요 {likesCount.toLocaleString()}개</p>
            )}

            {post.caption && (
              <p className="text-sm text-gray-900 leading-relaxed mb-2">
                <Link href={`/creator/${profile?.id}`} className="font-semibold mr-2">{displayName}</Link>
                {post.caption}
              </p>
            )}

            <p className="text-xs text-gray-400">{formatDistanceToNow(post.created_at)}</p>
          </div>

          {/* 댓글 목록 */}
          <div className="border-t border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">댓글 {comments.length}개</h3>

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <Link href={`/creator/${c.user_id}`}>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                        {c.profiles?.avatar_url ? (
                          <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (c.profiles?.full_name ?? '?').charAt(0)
                        )}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-2xl px-3 py-2">
                        <Link href={`/creator/${c.user_id}`} className="font-semibold text-gray-900 text-sm hover:underline">
                          {c.profiles?.full_name ?? '사용자'}
                        </Link>
                        <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 px-1">
                        <span className="text-xs text-gray-400">{formatDistanceToNow(c.created_at)}</span>
                        {user?.id === c.user_id && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">첫 댓글을 남겨보세요!</p>
                )}
              </div>
            )}

            {/* 댓글 입력 */}
            {user && (
              <form onSubmit={handleAddComment} className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user?.user_metadata?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl flex items-center px-4 py-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="댓글 달기..."
                    className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim()}
                    className="text-pink-500 font-semibold text-sm ml-2 disabled:opacity-40"
                  >
                    게시
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>
      </main>
    </div>
  )
}
