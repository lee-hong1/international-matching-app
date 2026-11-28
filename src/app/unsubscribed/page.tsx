'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { t, normalizeLang, type Lang } from '@src/lib/i18n'

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  return normalizeLang(navigator.language)
}

function UnsubscribedContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success') === 'true'
  const rawLang = searchParams.get('lang')
  const lang: Lang = rawLang ? normalizeLang(rawLang) : detectLang()

  return (
    <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
      {success ? (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('unsubscribe.success_title', lang)}</h1>
          <p className="text-gray-600 mb-6">
            {t('unsubscribe.success_body', lang)}<br />
            {t('unsubscribe.success_detail', lang)}
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('unsubscribe.error_title', lang)}</h1>
          <p className="text-gray-600 mb-6">
            {t('unsubscribe.error_body', lang)}<br />
            {t('unsubscribe.error_detail', lang)}
          </p>
        </>
      )}

      <div className="space-y-3">
        <Link
          href="/"
          className="block w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          {t('unsubscribe.go_home', lang)}
        </Link>

        {!success && (
          <a
            href="mailto:support@globalmatch.app"
            className="block w-full px-4 py-2 text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50 transition-colors"
          >
            {t('unsubscribe.contact_support', lang)}
          </a>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          {t('unsubscribe.login_tip', lang)}
        </p>
        <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 mt-2 inline-block">
          {t('unsubscribe.login', lang)}
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
