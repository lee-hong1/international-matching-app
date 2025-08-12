'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { matchingService, UserProfile } from '@/lib/matching'
import Image from 'next/image'

export default function DiscoverPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadProfiles()
    }
  }, [user, loading, router])

  const loadProfiles = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const recommendations = await matchingService.getRecommendations(user.id, 10)
      setProfiles(recommendations)
      setCurrentIndex(0)
    } catch (error) {
      console.error('Error loading profiles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (birthDate: string): number => {
    return matchingService.calculateAge(birthDate)
  }

  const handleLike = async () => {
    if (!user || !currentProfile) return

    try {
      const { isMatch } = await matchingService.likeUser(user.id, currentProfile.id)
      
      if (isMatch) {
        setShowMatchModal(true)
      }
      
      nextProfile()
    } catch (error) {
      console.error('Error liking user:', error)
    }
  }

  const handlePass = async () => {
    if (!user || !currentProfile) return

    try {
      await matchingService.passUser(user.id, currentProfile.id)
      nextProfile()
    } catch (error) {
      console.error('Error passing user:', error)
    }
  }

  const nextProfile = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // 프로필이 더 없으면 새로 로드
      loadProfiles()
    }
    
    setDragOffset({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    setDragOffset({
      x: e.clientX - rect.left - centerX,
      y: e.clientY - rect.top - centerY
    })
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    // 스와이프 임계값
    const threshold = 100
    
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleLike()
      } else {
        handlePass()
      }
    } else {
      setDragOffset({ x: 0, y: 0 })
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentProfile = profiles[currentIndex]

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">모든 프로필을 확인했습니다!</h2>
          <p className="text-gray-600 mb-6">새로운 추천을 받으려면 잠시 후 다시 확인해주세요.</p>
          <button
            onClick={loadProfiles}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700"
          >
            다시 로드하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-2xl font-bold text-purple-600"
              >
                💕 GlobalMatch
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {currentIndex + 1} / {profiles.length}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-md mx-auto px-4 py-8">
        <div className="relative h-[600px]">
          {/* 프로필 카드 */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* 프로필 이미지 */}
            <div className="relative h-3/5 bg-gradient-to-br from-purple-400 to-pink-400">
              {currentProfile.avatar_url ? (
                <Image
                  src={currentProfile.avatar_url}
                  alt={currentProfile.full_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-6xl">
                  {currentProfile.gender === 'female' ? '👩' : '👨'}
                </div>
              )}
              
              {/* 스와이프 힌트 */}
              <div className={`absolute inset-0 flex items-center justify-center ${
                dragOffset.x > 50 ? 'bg-green-500 bg-opacity-75' : 
                dragOffset.x < -50 ? 'bg-red-500 bg-opacity-75' : 'bg-transparent'
              }`}>
                {dragOffset.x > 50 && (
                  <div className="text-white text-4xl font-bold transform rotate-12">LIKE</div>
                )}
                {dragOffset.x < -50 && (
                  <div className="text-white text-4xl font-bold transform -rotate-12">NOPE</div>
                )}
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="p-6 h-2/5 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentProfile.full_name}
                </h2>
                <span className="text-lg text-gray-600">
                  {calculateAge(currentProfile.birth_date)}
                </span>
              </div>
              
              <div className="flex items-center text-gray-600 mb-3">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {currentProfile.country}
                {currentProfile.city && `, ${currentProfile.city}`}
              </div>

              {currentProfile.occupation && (
                <div className="flex items-center text-gray-600 mb-3">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0H8m8 0v10a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0V4a2 2 0 00-2-2H6a2 2 0 00-2 2v2" />
                  </svg>
                  {currentProfile.occupation}
                </div>
              )}

              {currentProfile.bio && (
                <p className="text-gray-700 mb-4 text-sm">
                  {currentProfile.bio}
                </p>
              )}

              {/* 관심사 태그 */}
              {currentProfile.interests.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.slice(0, 6).map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-600 text-xs rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 언어 */}
              {currentProfile.languages.length > 0 && (
                <div className="flex items-center text-gray-600 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {currentProfile.languages.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-center space-x-6 mt-8">
          <button
            onClick={handlePass}
            className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button
            onClick={handleLike}
            className="w-16 h-16 bg-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-purple-700 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* 사용법 안내 */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          카드를 좌우로 스와이프하거나 버튼을 눌러 선택하세요
        </div>
      </main>

      {/* 매칭 성공 모달 */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">매칭 성공!</h2>
            <p className="text-gray-600 mb-6">
              {currentProfile.full_name}님과 매칭되었습니다!
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMatchModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300"
              >
                계속 탐색
              </button>
              <button
                onClick={() => router.push('/messages')}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700"
              >
                메시지 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}