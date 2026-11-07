'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { storiesService, type StoryGroup, type Story } from '@/lib/stories'
import { useAuth } from '@/contexts/AuthContext'

interface StoryBarProps {
  onAddStory?: () => void
}

export default function StoryBar({ onAddStory }: StoryBarProps) {
  const { user } = useAuth()
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<StoryGroup | null>(null)
  const [activeStoryIndex, setActiveStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    storiesService.getFeedStories().then(setStoryGroups)
  }, [])

  function openStory(group: StoryGroup) {
    setActiveGroup(group)
    setActiveStoryIndex(0)
    setProgress(0)
    startProgress(group.stories[0])
    storiesService.markStoryViewed(group.stories[0].id)
  }

  function startProgress(story: Story) {
    if (progressInterval.current) clearInterval(progressInterval.current)
    setProgress(0)
    const duration = 5000
    const step = 100 / (duration / 100)
    progressInterval.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval.current!)
          return 100
        }
        return p + step
      })
    }, 100)
  }

  function nextStory() {
    if (!activeGroup) return
    if (activeStoryIndex < activeGroup.stories.length - 1) {
      const next = activeStoryIndex + 1
      setActiveStoryIndex(next)
      startProgress(activeGroup.stories[next])
      storiesService.markStoryViewed(activeGroup.stories[next].id)
    } else {
      closeStory()
    }
  }

  function prevStory() {
    if (!activeGroup || activeStoryIndex === 0) return
    const prev = activeStoryIndex - 1
    setActiveStoryIndex(prev)
    startProgress(activeGroup.stories[prev])
  }

  function closeStory() {
    if (progressInterval.current) clearInterval(progressInterval.current)
    setActiveGroup(null)
    setActiveStoryIndex(0)
    setProgress(0)
    // 조회 후 스토리 새로고침
    storiesService.getFeedStories().then(setStoryGroups)
  }

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(nextStory, 200)
      return () => clearTimeout(timer)
    }
  }, [progress])

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [])

  const currentStory = activeGroup?.stories[activeStoryIndex]

  return (
    <>
      {/* 스토리 바 */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* 내 스토리 추가 */}
        {user && (
          <button
            onClick={onAddStory}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-pink-300 bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition-colors">
              <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 w-16 text-center truncate">내 스토리</span>
          </button>
        )}

        {/* 스토리 목록 */}
        {storyGroups.map((group) => {
          const storyUser = group.user
          const displayName = storyUser?.creator_profiles?.display_name ?? storyUser?.full_name ?? '사용자'
          return (
            <button
              key={storyUser?.id}
              onClick={() => openStory(group)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className={`w-16 h-16 rounded-full p-0.5 ${group.has_unviewed ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gray-200'}`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden relative bg-gradient-to-br from-pink-200 to-purple-200">
                    {storyUser?.avatar_url ? (
                      <Image src={storyUser.avatar_url} alt={displayName} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-600 font-semibold text-lg">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-600 w-16 text-center truncate">{displayName}</span>
            </button>
          )
        })}
      </div>

      {/* 스토리 뷰어 모달 */}
      {activeGroup && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="relative w-full max-w-sm h-full max-h-screen">
            {/* 프로그레스 바 */}
            <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
              {activeGroup.stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-none"
                    style={{
                      width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* 스토리 헤더 */}
            <div className="absolute top-7 left-3 right-3 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
                  {activeGroup.user?.avatar_url ? (
                    <img src={activeGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-semibold text-xs">
                      {(activeGroup.user?.full_name ?? '?').charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-white font-semibold text-sm">
                  {activeGroup.user?.creator_profiles?.display_name ?? activeGroup.user?.full_name}
                </span>
              </div>
              <button onClick={closeStory} className="text-white p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 스토리 미디어 */}
            <div
              className="w-full h-full relative"
              style={{ backgroundColor: currentStory.bg_color }}
            >
              <img
                src={currentStory.media_url}
                alt="스토리"
                className="w-full h-full object-cover"
              />
              {currentStory.caption && (
                <div className="absolute bottom-16 left-0 right-0 text-center px-6">
                  <p className="text-white text-lg font-medium drop-shadow-lg">{currentStory.caption}</p>
                </div>
              )}
            </div>

            {/* 좌/우 터치 영역 */}
            <button onClick={prevStory} className="absolute left-0 top-0 w-1/3 h-full z-10" />
            <button onClick={nextStory} className="absolute right-0 top-0 w-2/3 h-full z-10" />
          </div>
        </div>
      )}
    </>
  )
}
