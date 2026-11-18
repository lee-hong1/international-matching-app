'use client'

import { useState } from 'react'
import { followsService } from '@/lib/follows'

interface FollowButtonProps {
  userId: string
  initialIsFollowing: boolean
  onFollowChange?: (isFollowing: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline'
}

export default function FollowButton({
  userId,
  initialIsFollowing,
  onFollowChange,
  size = 'md',
  variant = 'primary',
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  }

  async function handleClick() {
    setLoading(true)
    try {
      if (isFollowing) {
        const { error } = await followsService.unfollow(userId)
        if (!error) {
          setIsFollowing(false)
          onFollowChange?.(false)
        }
      } else {
        const { error } = await followsService.follow(userId)
        if (!error) {
          setIsFollowing(true)
          onFollowChange?.(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const baseClasses = `font-semibold rounded-lg transition-all duration-200 ${sizeClasses[size]} disabled:opacity-50`

  if (isFollowing) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${baseClasses} border border-gray-300 text-gray-700 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-600`}
      >
        {loading ? '...' : '팔로잉'}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${baseClasses} bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-sm`}
    >
      {loading ? '...' : '팔로우'}
    </button>
  )
}
