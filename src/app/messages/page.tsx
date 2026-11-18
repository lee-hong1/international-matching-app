'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { chatService, ChatRoom } from '@/lib/chat'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

export default function MessagesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { locale: lang } = useLanguage()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadChatRooms()
    }
  }, [user, loading, router])

  const loadChatRooms = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const rooms = await chatService.getUserChatRooms(user.id)
      setChatRooms(rooms)
    } catch (error) {
      console.error('Error loading chat rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    const locale = lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : 'en-US'

    if (diffInHours < 24) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString(locale, { weekday: 'short' })
    } else {
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    }
  }

  const filteredRooms = chatRooms.filter(room =>
    room.partner?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-2xl font-bold text-purple-600">
                💕 GlobalMatch
              </Link>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-purple-600">{t('nav.dashboard', lang)}</Link>
              <Link href="/discover" className="text-gray-600 hover:text-purple-600">{t('nav.discover', lang)}</Link>
              <Link href="/matches" className="text-gray-600 hover:text-purple-600">{t('nav.matching', lang)}</Link>
              <span className="text-purple-600 font-medium">{t('nav.messages', lang)}</span>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* 헤더 */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{t('messages.title', lang)}</h1>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('messages.search_placeholder', lang)}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 채팅방 목록 */}
          <div className="divide-y divide-gray-200">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? t('messages.empty_search', lang) : t('messages.empty_no_matches', lang)}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? t('messages.empty_hint_search', lang) : t('messages.empty_hint_match', lang)}
                </p>
                {!searchTerm && (
                  <Link
                    href="/discover"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                  >
                    {t('messages.find_people', lang)}
                  </Link>
                )}
              </div>
            ) : (
              filteredRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/messages/${room.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      {/* 프로필 사진 */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center overflow-hidden">
                          {room.partner?.avatar_url ? (
                            <Image
                              src={room.partner.avatar_url}
                              alt={room.partner.full_name}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <span className="text-white text-lg">👤</span>
                          )}
                        </div>
                      </div>

                      {/* 대화 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {room.partner?.full_name}
                          </p>
                          {room.last_message_at && (
                            <p className="text-xs text-gray-500">
                              {formatMessageTime(room.last_message_at)}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-500">
                              📍 {room.partner?.country}
                            </p>
                          </div>
                          {(room.unread_count ?? 0) > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-purple-600 rounded-full">
                              {room.unread_count! > 99 ? '99+' : room.unread_count}
                            </span>
                          )}
                        </div>

                        {room.last_message && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {room.last_message.content}
                          </p>
                        )}
                      </div>

                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* 도움말 섹션 */}
        <div className="mt-8 bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-purple-900 mb-2">💡 {t('messages.tips_title', lang)}</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• {t('messages.tip_1', lang)}</li>
            <li>• {t('messages.tip_2', lang)}</li>
            <li>• {t('messages.tip_3', lang)}</li>
            <li>• {t('messages.tip_4', lang)}</li>
          </ul>
        </div>
      </main>
    </div>
  )
}