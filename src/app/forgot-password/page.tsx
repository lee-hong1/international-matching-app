'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

export default function ForgotPasswordPage() {
  const { locale: lang } = useLanguage()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsSending(true)
    setError('')

    const { error: authErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile/edit`,
    })

    if (authErr) {
      setError(authErr.message)
      setIsSending(false)
      return
    }

    setSent(true)
    setIsSending(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-purple-600">💕 GlobalMatch</Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">{t('auth.forgot_title', lang)}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('auth.forgot_desc', lang)}</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">📧</div>
            <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              {t('auth.forgot_sent', lang)}
            </p>
            <Link href="/login" className="block text-sm text-purple-600 hover:underline font-medium">
              {t('auth.forgot_back', lang)}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email_label', lang)}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSending || !email.trim()}
              className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
            >
              {isSending ? t('auth.forgot_sending', lang) : t('auth.forgot_send', lang)}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link href="/login" className="text-purple-600 hover:underline font-medium">
                {t('auth.forgot_back', lang)}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
