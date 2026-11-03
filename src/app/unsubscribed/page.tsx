'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function UnsubscribedContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
      {success ? (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">수신 거부 완료</h1>
          <p className="text-gray-600 mb-6">
            이메일 수신 거부가 성공적으로 처리되었습니다.<br />
            더 이상 해당 유형의 이메일을 받지 않습니다.
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">처리 실패</h1>
          <p className="text-gray-600 mb-6">
            수신 거부 처리 중 오류가 발생했습니다.<br />
            다시 시도하거나 고객 지원팀에 문의해 주세요.
          </p>
        </>
      )}

      <div className="space-y-3">
        <Link
          href="/"
          className="block w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          홈으로 돌아가기
        </Link>

        {!success && (
          <a
            href="mailto:support@globalmatch.app"
            className="block w-full px-4 py-2 text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50 transition-colors"
          >
            고객 지원팀 문의
          </a>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          계정이 있으시다면 로그인하여 이메일 설정을 더 자세히 관리할 수 있습니다.
        </p>
        <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 mt-2 inline-block">
          로그인하기 →
        </Link>
      </div>
    </div>
  )
}

export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Suspense fallback={<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}>
        <UnsubscribedContent />
      </Suspense>
    </div>
  )
}
