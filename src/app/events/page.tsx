'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { eventsService, EVENT_TYPE_LABELS, type EventItem, type EventType } from '@/lib/events'

const TYPE_FILTERS: { key: EventType | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'drink', label: '술 친구' },
  { key: 'meal', label: '밥 친구' },
  { key: 'party', label: '파티원 모집' },
]

function formatDateTime(value: string) {
  const date = new Date(value)
  return date.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EventsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [activeType, setActiveType] = useState<EventType | 'all'>('all')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  const loadEvents = useCallback(async (type: EventType | 'all') => {
    setLoadingEvents(true)
    try {
      const data = await eventsService.getEvents(type === 'all' ? undefined : type)
      setEvents(data)
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    if (user) loadEvents(activeType)
  }, [user, activeType, loadEvents])

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">오프라인 모임</h1>
          <Link
            href="/events/create"
            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl"
          >
            모임 만들기
          </Link>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveType(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeType === f.key
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {loadingEvents ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">아직 모집 중인 모임이 없습니다</h3>
            <p className="text-sm text-gray-500 mb-4">새로운 모임을 만들어보세요!</p>
            <Link
              href="/events/create"
              className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl"
            >
              모임 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {event.partner_venues?.image_url && (
                  <div className="relative w-full h-32">
                    <Image src={event.partner_venues.image_url} alt="" fill className="object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-xs font-semibold rounded-full">
                      {EVENT_TYPE_LABELS[event.event_type]}
                    </span>
                    {event.venue_type === 'partner' && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">
                        제휴 매장
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{formatDateTime(event.event_datetime)}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    {event.venue_type === 'partner' ? event.partner_venues?.name : event.custom_location}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden flex-shrink-0">
                        {event.profiles?.avatar_url ? (
                          <Image src={event.profiles.avatar_url} alt="" width={24} height={24} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-xs font-semibold">
                            {(event.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{event.profiles?.full_name ?? '호스트'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {event.fee_per_person > 0 ? `${event.fee_per_person.toLocaleString()}원` : '무료'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {event.participants_count}/{event.max_participants}명
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">홈</span>
          </Link>
          <Link href="/explore" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs">탐색</span>
          </Link>
          <Link href="/events" className="flex flex-col items-center gap-0.5 text-pink-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">모임</span>
          </Link>
          <Link href="/discover" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">매칭</span>
          </Link>
          <Link href={`/creator/${user?.id}`} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs">프로필</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
