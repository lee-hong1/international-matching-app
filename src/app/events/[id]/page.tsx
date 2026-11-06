'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eventsService, type EventItem } from '@/lib/events'
import { t as i18nT, type Lang } from '@src/lib/i18n'
import { TOSS_CLIENT_KEY } from '@/lib/payments'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { EventShareCard } from '@/components/EventShareCard'

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, params: Record<string, unknown>) => Promise<void>
    }
  }
}

const LOCALE_BCP47: Record<string, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN' }

function formatDateTime(value: string, locale = 'ko') {
  const date = new Date(value)
  return date.toLocaleString(LOCALE_BCP47[locale] ?? 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EventDetailContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const { t, locale } = useLanguage()
  const [event, setEvent] = useState<EventItem | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [myApplication, setMyApplication] = useState<{ id: string; status: string } | null>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  const STATUS_LABELS: Record<string, string> = {
    pending_payment: t('detail_pending'),
    approved: t('detail_approved'),
    rejected: t('detail_rejected'),
    cancelled: t('detail_cancelled'),
  }

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  const loadEvent = useCallback(async () => {
    setLoadingEvent(true)
    try {
      const data = await eventsService.getEvent(eventId)
      setEvent(data)
    } finally {
      setLoadingEvent(false)
    }
  }, [eventId])

  useEffect(() => {
    if (user && eventId) loadEvent()
  }, [user, eventId, loadEvent])

  useEffect(() => {
    if (!user || !event) return

    if (event.host_id === user.id) {
      eventsService.getEventParticipants(eventId).then(setParticipants)
    } else {
      supabase
        .from('event_participants')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setMyApplication(data))
    }
  }, [user, event, eventId])

  async function getAuthHeader() {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  async function handleApply() {
    if (!event) return
    setError('')
    setApplying(true)
    try {
      const authHeader = await getAuthHeader()
      const res = await fetch(`/api/events/${eventId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Application failed')
        return
      }

      if (!data.requiresPayment) {
        setMyApplication(data.participant)
        return
      }

      // 유료 이벤트: 토스페이먼츠 결제창 호출
      if (!window.TossPayments) {
        setError('Payment module failed to load. Please try again.')
        return
      }

      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY)
      await tossPayments.requestPayment('카드', {
        amount: data.payment.amount,
        orderId: data.payment.orderId,
        orderName: data.payment.orderName,
        customerName: user?.user_metadata?.full_name ?? user?.email ?? 'Member',
        successUrl: `${window.location.origin}/payments/success?eventId=${eventId}`,
        failUrl: `${window.location.origin}/payments/fail?eventId=${eventId}`,
      })
    } catch (err: any) {
      if (err?.code !== 'USER_CANCEL') {
        setError('Payment failed. Please try again.')
      }
    } finally {
      setApplying(false)
    }
  }

  async function handleParticipantStatus(participantId: string, status: 'approved' | 'rejected') {
    await eventsService.updateParticipantStatus(participantId, status)
    setParticipants((prev) => prev.map((p) => (p.id === participantId ? { ...p, status } : p)))
  }

  if (loading || loadingEvent || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">모임을 찾을 수 없습니다</p>
      </div>
    )
  }

  const isHost = event.host_id === user?.id
  const isFull = event.participants_count >= event.max_participants
  const isClosed = event.status !== 'open'

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Script src="https://js.tosspayments.com/v1/payment" strategy="lazyOnload" />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{t('nav_events')}</h1>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {event.partner_venues?.image_url && (
          <div className="relative w-full h-48 rounded-2xl overflow-hidden">
            <Image src={event.partner_venues.image_url} alt="" fill className="object-cover" />
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-xs font-semibold rounded-full">
              {i18nT(`events.type.${event.event_type}`, locale as Lang)}
            </span>
            {event.venue_type === 'partner' && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-semibold rounded-full">
                {t('events_partner_venue')}
              </span>
            )}
            {isClosed && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">
                {t('events_closed')}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h2>
          {event.description && (
            <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{event.description}</p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDateTime(event.event_datetime, locale)}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.venue_type === 'partner' ? event.partner_venues?.name : event.custom_location}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 3a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {event.participants_count} / {event.max_participants}{t('events_persons')}
            </div>
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c.74 0 1.412.196 1.94.518M12 8V6m0 12v-2" />
              </svg>
              {event.fee_per_person > 0 ? `₩${event.fee_per_person.toLocaleString()}` : t('events_free')}
            </div>
          </div>

          {event.partner_venues?.discount_price != null && event.venue_type === 'partner' && (
            <p className="mt-3 text-xs text-pink-500 bg-pink-50 rounded-lg px-3 py-2">
              {t('detail_partner_discount')}: ₩{event.partner_venues.discount_price.toLocaleString()}
            </p>
          )}
        </div>

        {/* 호스트 정보 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0">
            {event.profiles?.avatar_url ? (
              <Image src={event.profiles.avatar_url} alt="" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm font-semibold">
                {(event.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{event.profiles?.full_name ?? t('detail_host')}</p>
            <p className="text-xs text-gray-400">{t('detail_host')}</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        {/* 참가 신청 영역 */}
        {!isHost && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            {myApplication ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-700 mb-1">{t('detail_my_status')}</p>
                <p className="text-base font-semibold text-gray-900">
                  {STATUS_LABELS[myApplication.status] ?? myApplication.status}
                </p>
              </div>
            ) : isClosed ? (
              <p className="text-center text-sm text-gray-500 py-2">{t('events_closed')}</p>
            ) : isFull ? (
              <p className="text-center text-sm text-gray-500 py-2">{t('events_full')}</p>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {applying ? t('detail_applying') : event.fee_per_person > 0 ? `${event.fee_per_person.toLocaleString()}${t('detail_pay_apply')}` : t('detail_apply')}
              </button>
            )}
          </div>
        )}

        {/* 호스트: 참가자 목록 */}
        {isHost && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('detail_participants')} ({participants.length})</h3>
            {participants.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">{t('detail_no_participants')}</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl border border-gray-100">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0">
                      {p.profiles?.avatar_url ? (
                        <Image src={p.profiles.avatar_url} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-semibold">
                          {(p.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.profiles?.full_name ?? t('detail_host')}</p>
                      <p className="text-xs text-gray-400">{STATUS_LABELS[p.status] ?? p.status}</p>
                    </div>
                    {p.status === 'pending_payment' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleParticipantStatus(p.id, 'approved')}
                          className="px-3 py-1.5 bg-pink-500 text-white text-xs font-semibold rounded-lg"
                        >
                          {t('detail_approve')}
                        </button>
                        <button
                          onClick={() => handleParticipantStatus(p.id, 'rejected')}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg"
                        >
                          {t('detail_reject')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isHost && event && (
          <EventShareCard
            eventId={event.id}
            title={event.title}
            date={formatDateTime(event.event_datetime, locale)}
            location={event.venue_type === 'partner' ? (event.partner_venues?.name ?? '') : (event.custom_location ?? '')}
            fee={event.fee_per_person}
            hostName={event.profiles?.full_name ?? ''}
          />
        )}

        <Link href="/events" className="block text-center text-sm text-gray-400 hover:text-gray-600 py-2">
          {t('detail_back_list')}
        </Link>
      </main>
    </div>
  )
}

export default function EventDetailPage() {
  return (
    <LanguageProvider>
      <EventDetailContent />
    </LanguageProvider>
  )
}
