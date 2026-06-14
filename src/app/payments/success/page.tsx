'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>('confirming')
  const [errorMessage, setErrorMessage] = useState('')

  const eventId = searchParams.get('eventId')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setErrorMessage('결제 정보가 올바르지 않습니다')
      return
    }

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMessage(data.error ?? '결제 승인에 실패했습니다')
        return
      }

      setStatus('success')
    })()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full">
        {status === 'confirming' && (
          <>
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">결제를 확인하고 있습니다...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">결제가 완료되었습니다</h3>
            <p className="text-sm text-gray-500 mb-4">참가 신청이 승인되었습니다.</p>
            <button
              onClick={() => router.push(eventId ? `/events/${eventId}` : '/events')}
              className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl"
            >
              모임으로 돌아가기
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">결제 승인에 실패했습니다</h3>
            <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
            <Link href={eventId ? `/events/${eventId}` : '/events'} className="inline-block px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl">
              모임으로 돌아가기
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
