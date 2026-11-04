'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const ALLOWED_RETURN_PATHS = ['/host/register', '/host/dashboard', '/']

const I18N = {
  ko: {
    title: '연령 확인',
    subtitle: '서비스 이용을 위해 생년월일을 입력해주세요.',
    label: '생년월일',
    agree: '개인정보 처리방침에 동의합니다',
    submit: '확인',
    under19: '만 19세 미만은 서비스를 이용할 수 없습니다.',
    error: '오류가 발생했습니다. 다시 시도해주세요.',
    already: '이미 연령 확인이 완료되었습니다.',
    preview: (age: number) => `만 ${age}세`,
  },
  en: {
    title: 'Age Verification',
    subtitle: 'Please enter your date of birth to use the service.',
    label: 'Date of Birth',
    agree: 'I agree to the Privacy Policy',
    submit: 'Confirm',
    under19: 'Users under 19 years old cannot use this service.',
    error: 'An error occurred. Please try again.',
    already: 'Age verification already completed.',
    preview: (age: number) => `Age ${age}`,
  },
  ja: {
    title: '年齢確認',
    subtitle: 'サービスをご利用いただくには生年月日をご入力ください。',
    label: '生年月日',
    agree: '個人情報処理方針に同意します',
    submit: '確認',
    under19: '19歳未満の方はご利用いただけません。',
    error: 'エラーが発生しました。もう一度お試しください。',
    already: '年齢確認はすでに完了しています。',
    preview: (age: number) => `${age}歳`,
  },
  zh: {
    title: '年龄验证',
    subtitle: '请输入您的出生日期以使用本服务。',
    label: '出生日期',
    agree: '我同意隐私政策',
    submit: '确认',
    under19: '未满19岁的用户无法使用本服务。',
    error: '发生错误，请重试。',
    already: '年龄验证已完成。',
    preview: (age: number) => `${age}岁`,
  },
}

function getLang(): keyof typeof I18N {
  if (typeof navigator === 'undefined') return 'ko'
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('ja')) return 'ja'
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('ko')) return 'ko'
  return 'en'
}

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function VerifyAgeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [lang, setLang] = useState<keyof typeof I18N>('ko')
  const [birthDate, setBirthDate] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'under19' | 'error' | 'already'>('idle')

  useEffect(() => {
    setLang(getLang())
  }, [])

  const t = I18N[lang]
  const age = calcAge(birthDate)
  const returnUrl = (() => {
    const r = searchParams.get('returnUrl') ?? ''
    return ALLOWED_RETURN_PATHS.includes(r) ? r : '/'
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed || !birthDate) return
    setStatus('loading')

    try {
      const res = await fetch('/api/auth/verify-age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birth_date: birthDate }),
      })

      if (res.status === 409) { setStatus('already'); router.push(returnUrl); return }
      if (res.status === 403) { setStatus('under19'); return }
      if (!res.ok) { setStatus('error'); return }

      router.push(returnUrl)
    } catch {
      setStatus('error')
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>{t.title}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{t.subtitle}</p>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>{t.label}</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => { setBirthDate(e.target.value); setStatus('idle') }}
          max={new Date().toISOString().split('T')[0]}
          min="1900-01-01"
          required
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem', boxSizing: 'border-box' }}
        />
        {age !== null && (
          <p style={{ marginTop: 6, fontSize: '0.875rem', color: age >= 19 ? '#16a34a' : '#dc2626' }}>
            {t.preview(age)}
          </p>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
          <span style={{ fontSize: '0.875rem' }}>{t.agree}</span>
        </label>

        {status === 'under19' && (
          <p style={{ marginTop: 12, color: '#dc2626', fontSize: '0.875rem' }}>{t.under19}</p>
        )}
        {status === 'error' && (
          <p style={{ marginTop: 12, color: '#dc2626', fontSize: '0.875rem' }}>{t.error}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !agreed || !birthDate}
          style={{
            marginTop: 20, width: '100%', padding: '12px',
            background: '#9333ea', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: '1rem', fontWeight: 600,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
          }}
        >
          {status === 'loading' ? '...' : t.submit}
        </button>
      </form>
    </main>
  )
}

export default function VerifyAgePage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>...</div>}>
      <VerifyAgeForm />
    </Suspense>
  )
}
