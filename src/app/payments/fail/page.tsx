'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('eventId')
  const message = searchParams.get('message')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">결제가 취소되었습니다</h3>
        <p className="text-sm text-gray-500 mb-4">{message ?? '결제가 진행되지 않았습니다.'}</p>
        <Link href={eventId ? `/events/${eventId}` : '/events'} className="inline-block px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl">
          모임으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
