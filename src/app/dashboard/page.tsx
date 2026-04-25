'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserProfile {
  id: string
  full_name: string
  avatar_url?: string
  country: string
  age: number
  verification_status: string
  is_premium: boolean
  last_active: string
}

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [matches, setMatches] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-purple-600">
                💕 GlobalMatch
              </Link>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-purple-600 font-medium">대시보드</Link>
              <Link href="/feed" className="text-gray-600 hover:text-purple-600">피드</Link>
              <Link href="/explore" className="text-gray-600 hover:text-purple-600">탐색</Link>
              <Link href="/discover" className="text-gray-600 hover:text-purple-600">매칭</Link>
              <Link href="/messages" className="text-gray-600 hover:text-purple-600">메시지</Link>
              <Link href={`/creator/${user?.id ?? ''}`} className="text-gray-600 hover:text-purple-600">내 채널</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600">안녕하세요, {user.user_metadata?.full_name || user.email}님!</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">프로필 조회수</p>
                <p className="text-2xl font-semibold text-gray-900">127</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">받은 좋아요</p>
                <p className="text-2xl font-semibold text-gray-900">23</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">새 메시지</p>
                <p className="text-2xl font-semibold text-gray-900">5</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">매칭 수</p>
                <p className="text-2xl font-semibold text-gray-900">12</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 최근 매칭 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">최근 매칭</h2>
              <Link href="/matches" className="text-purple-600 hover:text-purple-500 text-sm font-medium">
                모두 보기
              </Link>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Maria Rodriguez</p>
                    <p className="text-sm text-gray-600">스페인, 28세</p>
                  </div>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">
                    메시지
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 활동</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <p className="text-gray-900">새로운 매칭이 있습니다!</p>
                  <p className="text-sm text-gray-600">2시간 전</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <div>
                  <p className="text-gray-900">프로필을 조회했습니다</p>
                  <p className="text-sm text-gray-600">4시간 전</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <div>
                  <p className="text-gray-900">메시지를 받았습니다</p>
                  <p className="text-sm text-gray-600">1일 전</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 프로필 완성도 */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">프로필 완성도</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="bg-white bg-opacity-20 rounded-full h-3">
                <div className="bg-white rounded-full h-3" style={{ width: '75%' }}></div>
              </div>
            </div>
            <span className="text-lg font-semibold">75%</span>
          </div>
          <p className="mt-4 text-white text-opacity-90">
            프로필을 완성하여 더 많은 매칭 기회를 얻으세요!
          </p>
          <Link href="/profile/edit" className="inline-block mt-4 bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100">
            프로필 완성하기
          </Link>
        </div>
      </main>
    </div>
  )
}