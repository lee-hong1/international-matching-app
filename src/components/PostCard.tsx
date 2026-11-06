'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { postsService, type Post } from '@/lib/posts'
import { formatDistanceToNow } from '@/lib/dateUtils'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onPostDeleted?: (postId: string) => void
}

export default function PostCard({ post, currentUserId, onPostDeleted }: PostCardProps) {
  const [liked, setLiked] = useState(post.is_liked ?? false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [liking, setLiking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const isOwner = currentUserId === post.user_id
  const displayName = post.profiles?.creator_profiles?.display_name ?? post.profiles?.full_name ?? '익명'
  const avatarUrl = post.profiles?.avatar_url
  const firstMedia = post.post_media?.sort((a, b) => a.order_index - b.order_index)[0]

  async function handleLike() {
    if (liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikesCount((n) => wasLiked ? Math.max(0, n - 1) : n + 1)
    const { error } = wasLiked
      ? await postsService.unlikePost(post.id)
      : await postsService.likePost(post.id)
    if (error) {
      setLiked(wasLiked)
      setLikesCount((n) => wasLiked ? n + 1 : Math.max(0, n - 1))
    }
    setLiking(false)
  }

  async function handleDelete() {
    if (!confirm('게시물을 삭제할까요?')) return
    const { error } = await postsService.deletePost(post.id)
    if (!error) onPostDeleted?.(post.id)
  }

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4">
        <Link href={`/creator/${post.user_id}`} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                {displayName.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{displayName}</p>
            {post.profiles?.country && (
              <p className="text-xs text-gray-400">{post.profiles.country}</p>
            )}
          </div>
        </Link>
        {isOwner && (
          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="더 보기">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => { setShowMenu(false); handleDelete() }}
                  className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 미디어 */}
      {firstMedia && (
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {firstMedia.media_type === 'video' ? (
            <video src={firstMedia.media_url} className="w-full h-full object-cover" controls playsInline />
          ) : (
            <img src={firstMedia.media_url} alt={post.caption ?? '게시물 이미지'} className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {/* 액션 바 */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-3">
        <button
          onClick={handleLike}
          disabled={liking}
          aria-label={liked ? '좋아요 취소' : '좋아요'}
          className="flex items-center gap-1 text-sm font-medium transition-colors"
          style={{ color: liked ? '#ec4899' : '#9ca3af' }}
        >
          <svg className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likesCount > 0 && <span>{likesCount.toLocaleString()}</span>}
        </button>
        <Link href={`/posts/${post.id}`} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post.comments_count > 0 && <span>{post.comments_count.toLocaleString()}</span>}
        </Link>
      </div>

      {/* 캡션 */}
      {post.caption && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-800 leading-relaxed">
            <span className="font-semibold mr-1">{displayName}</span>
            {post.caption}
          </p>
          {post.location && (
            <p className="text-xs text-gray-400 mt-1">📍 {post.location}</p>
          )}
          <p className="text-xs text-gray-300 mt-1">
            {formatDistanceToNow(post.created_at)}
          </p>
        </div>
      )}
    </article>
  )
}
