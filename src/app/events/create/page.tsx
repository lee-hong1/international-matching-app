'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eventsService, EVENT_TYPE_LABELS, type EventType, type VenueType, type PartnerVenue } from '@/lib/events'

const EVENT_TYPES: EventType[] = ['drink', 'meal', 'party']

export default function CreateEventPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checkingPremium, setCheckingPremium] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [venues, setVenues] = useState<PartnerVenue[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [eventType, setEventType] = useState<EventType>('drink')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [venueType, setVenueType] = useState<VenueType>('partner')
  const [venueId, setVenueId] = useState('')
  const [customLocation, setCustomLocation] = useState('')
  const [eventDatetime, setEventDatetime] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [feePerPerson, setFeePerPerson] = useState(0)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single()
      setIsPremium(!!profile?.is_premium)
      setCheckingPremium(false)

      const data = await eventsService.getPartnerVenues()
      setVenues(data)
      if (data.length > 0) setVenueId(data[0].id)
    })()
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('제목을 입력해주세요')
      return
    }
    if (!eventDatetime) {
      setError('일정을 선택해주세요')
      return
    }
    if (venueType === 'partner' && !venueId) {
      setError('제휴 매장을 선택해주세요')
      return
    }
    if (venueType === 'custom' && !customLocation.trim()) {
      setError('장소를 입력해주세요')
      return
    }

    setSubmitting(true)
    try {
      const { event, error: createError } = await eventsService.createEvent({
        eventType,
        title: title.trim(),
        description: description.trim() || undefined,
        venueType,
        venueId: venueType === 'partner' ? venueId : undefined,
        customLocation: venueType === 'custom' ? customLocation.trim() : undefined,
        eventDatetime: new Date(eventDatetime).toISOString(),
        maxParticipants,
        feePerPerson,
      })

      if (createError || !event) {
        setError(createError?.message ?? '모임 생성에 실패했습니다')
        return
      }

      router.push(`/events/${event.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || checkingPremium || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">유료 회원만 이용 가능합니다</h3>
          <p className="text-sm text-gray-500 mb-4">모임 만들기는 프리미엄 멤버십 가입 후 이용할 수 있어요.</p>
          <Link href="/premium" className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl">
            프리미엄 알아보기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">모임 만들기</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 모임 유형 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <label className="block text-sm font-semibold text-gray-900 mb-3">모임 유형</label>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    eventType === type
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {EVENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* 제목/설명 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예) 강남에서 가볍게 한잔 하실 분!"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-pink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">설명 (선택)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="모임에 대한 설명을 적어주세요"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-pink-400 resize-none"
              />
            </div>
          </div>

          {/* 장소 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">모임 장소</label>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setVenueType('partner')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${venueType === 'partner' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                제휴 매장
              </button>
              <button
                type="button"
                onClick={() => setVenueType('custom')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${venueType === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                직접 입력
              </button>
            </div>

            {venueType === 'partner' ? (
              venues.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">이용 가능한 제휴 매장이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {venues.map((venue) => (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => setVenueId(venue.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        venueId === venue.id ? 'border-pink-400 bg-pink-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {venue.image_url ? (
                          <Image src={venue.image_url} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{venue.name}</p>
                        <p className="text-xs text-gray-500 truncate">{venue.address}</p>
                        {venue.discount_price != null && (
                          <p className="text-xs text-pink-500 font-medium mt-0.5">
                            제휴 할인가 {venue.discount_price.toLocaleString()}원
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="예) 강남역 11번 출구 OO카페"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-pink-400"
              />
            )}
          </div>

          {/* 일정/인원/참가비 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">모임 일시</label>
              <input
                type="datetime-local"
                value={eventDatetime}
                onChange={(e) => setEventDatetime(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-pink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">모집 인원</label>
              <input
                type="number"
                min={1}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-pink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">참가비 (원, 무료는 0)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={feePerPerson}
                onChange={(e) => setFeePerPerson(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-pink-400"
              />
              <p className="text-xs text-gray-400 mt-1">참가비에서 플랫폼 수수료가 차감된 금액이 호스트에게 정산됩니다.</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {submitting ? '생성 중...' : '모임 만들기'}
          </button>
        </form>
      </main>
    </div>
  )
}
