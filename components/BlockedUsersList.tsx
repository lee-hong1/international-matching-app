'use client'

import React, { useState, useEffect } from 'react'
import { reportingService } from '@/lib/reporting'

interface BlockedUser {
  id: string
  blocked_user_id: string
  reason: string
  created_at: string
  is_mutual: boolean
  blocked_user: {
    id: string
    full_name: string
    avatar_url: string
    country: string
  }
}

interface BlockedUsersListProps {
  userId: string
}

export default function BlockedUsersList({ userId }: BlockedUsersListProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBlockedUsers()
  }, [userId, page])

  const loadBlockedUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/blocks?userId=${userId}&page=${page}&limit=10`)
      
      if (!response.ok) {
        throw new Error('차단된 사용자 목록을 불러오는데 실패했습니다.')
      }
      
      const data = await response.json()
      setBlockedUsers(data.blocks)
      setTotalPages(data.totalPages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (blockedUserId: string) => {
    try {
      setUnblocking(blockedUserId)
      
      const response = await fetch(`/api/blocks/${blockedUserId}?blockerId=${userId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('차단 해제에 실패했습니다.')
      }
      
      // 목록에서 제거
      setBlockedUsers(blockedUsers.filter(user => user.blocked_user_id !== blockedUserId))
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUnblocking(null)
    }
  }

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadBlockedUsers}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
        <p>차단한 사용자가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">차단된 사용자</h3>
      
      <div className="space-y-3">
        {blockedUsers.map((block) => (
          <div key={block.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                {block.blocked_user.avatar_url ? (
                  <img
                    src={block.blocked_user.avatar_url}
                    alt={block.blocked_user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">{block.blocked_user.full_name}</h4>
                  {block.is_mutual && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                      상호 차단
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{block.blocked_user.country}</p>
                <p className="text-xs text-gray-400 mt-1">
                  차단 사유: {block.reason}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(block.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handleUnblock(block.blocked_user_id)}
              disabled={unblocking === block.blocked_user_id}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            >
              {unblocking === block.blocked_user_id ? (
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>해제 중...</span>
                </div>
              ) : (
                '차단 해제'
              )}
            </button>
          </div>
        ))}
      </div>
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || loading}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages || loading}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}