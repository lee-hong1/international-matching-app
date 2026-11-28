'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { postsService, type Post } from '@/lib/posts'
import { formatDistanceToNow } from '@/lib/dateUtils'

interface PostCardProps {
  post: Post
  onPostDeleted?: (postId: string) => void
  currentUserId?: string
}

export default function PostCard({ post, onPostDeleted, currentUserId }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked ?? false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const media = post.post_media ?? []
  const profile = post.profiles
  const displayName = profile?.creator_profiles?.display_name ?? profile?.full_name ?? '사용자'

  async function handleLike() {
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

  async function handleShowComments() {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true)
      const data = await postsService.getComments(post.id)
      setComments(data)
      setLoadingComments(false)
    }
    setShowComments(!showComments)
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    const { comment: newComment } = await postsService.addComment(post.id, comment.trim())
    if (newComment) {
      setComments((prev) => [...prev, newComment])
      setComment('')
    }
  }

  async function handleDelete() {
    if (!confirm('게시물을 삭제하시겠습니까?')) return
    await postsService.deletePost(post.id)
    onPostDeleted?.(post.id)
  }

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4">
        <Link href={`/creator/${profile?.id}`} className="flex items-center space-x-3">
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
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {post.location}
              </p>
            )}
          </div>
        </Link>

        {currentUserId === post.user_id && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-gray-100">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-10">
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-xl"
                >
                  삭제하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 미디어 */}
      {media.length > 0 && (
        <div className="relative bg-black aspect-square">
          <Image
            src={media[currentMediaIndex].media_url}
            alt="게시물 이미지"
            fill
            className="object-cover"
          />
          {media.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={() => setCurrentMediaIndex((i) => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {currentMediaIndex < media.length - 1 && (
                <button
                  onClick={() => setCurrentMediaIndex((i) => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              {/* 인디케이터 */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentMediaIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentMediaIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 액션 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-transform active:scale-110 ${isLiked ? 'text-red-500' : 'text-gray-600'}`}
            >
              <svg className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button
              onClick={handleShowComments}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <Link href={`/post/${post.id}`} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 좋아요 수 */}
        {likesCount > 0 && (
          <p className="text-sm font-semibold text-gray-900 mb-2">좋아요 {likesCount.toLocaleString()}개</p>
        )}

        {/* 캡션 */}
        {post.caption && (
          <p className="text-sm text-gray-900 mb-2">
            <Link href={`/creator/${profile?.id}`} className="font-semibold mr-2">{displayName}</Link>
            {post.caption}
          </p>
        )}

        {/* 댓글 수 표시 */}
        {post.comments_count > 0 && (
          <button
            onClick={handleShowComments}
            className="text-sm text-gray-500 mb-2 hover:text-gray-700"
          >
            댓글 {post.comments_count}개 보기
          </button>
        )}

        {/* 시간 */}
        <p className="text-xs text-gray-400">{formatDistanceToNow(post.created_at)}</p>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {loadingComments ? (
            <div className="py-4 flex justify-center">
              <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 pt-3 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (c.profiles?.full_name ?? '?').charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-900 mr-2">{c.profiles?.full_name ?? '사용자'}</span>
                      {c.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 댓글 입력 */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-3">
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
              className="text-pink-500 font-semibold text-sm disabled:opacity-40"
            >
              게시
            </button>
          </form>
        </div>
      )}
    </article>
  )
}
