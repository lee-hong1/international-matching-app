'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const COUNTRIES = [
  '한국', '미국', '캐나다', '영국', '독일', '프랑스', '이탈리아', '스페인',
  '러시아', '우크라이나', '폴란드', '체코', '슬로바키아', '헝가리', '루마니아',
  '브라질', '아르헨티나', '콜롬비아', '칠레', '페루',
  '일본', '중국', '대만', '베트남', '태국', '필리핀', '인도네시아', '말레이시아',
  '인도', '파키스탄', '방글라데시',
  '터키', '이스라엘', '사우디아라비아', '이란',
  '남아프리카공화국', '나이지리아', '케냐', '이집트',
  '호주', '뉴질랜드', '멕시코', '기타',
]

const INTERESTS = [
  '여행', '음악', '영화', '독서', '요리', '운동', '사진', '패션',
  '뷰티', '댄스', '아트', '게임', '반려동물', '자연', '쇼핑', '카페',
]

interface FormData {
  email: string
  password: string
  fullName: string
  gender: 'male' | 'female'
  birthDate: string
  country: string
  bio: string
  interests: string[]
}

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    gender: 'female',
    birthDate: '',
    country: '',
    bio: '',
    interests: [],
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(key: keyof FormData, value: any) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function toggleInterest(interest: string) {
    setForm((p) => ({
      ...p,
      interests: p.interests.includes(interest)
        ? p.interests.filter((i) => i !== interest)
        : p.interests.length < 8 ? [...p.interests, interest] : p.interests,
    }))
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function validateStep1(): string | null {
    if (!form.email) return '이메일을 입력하세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '올바른 이메일 형식을 입력하세요.'
    if (!form.password) return '비밀번호를 입력하세요.'
    if (form.password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.'
    if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
      return '비밀번호는 영문과 숫자를 포함해야 합니다.'
    if (form.password !== confirmPassword) return '비밀번호가 일치하지 않습니다.'
    if (!agreed) return '이용약관에 동의해 주세요.'
    return null
  }

  function validateStep2(): string | null {
    if (!form.fullName.trim()) return '이름을 입력하세요.'
    if (!form.birthDate) return '생년월일을 입력하세요.'
    const age = Math.floor((Date.now() - new Date(form.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    if (age < 18) return '18세 이상만 가입 가능합니다.'
    if (!form.country) return '국가를 선택하세요.'
    return null
  }

  function goNext() {
    setError('')
    const err = step === 1 ? validateStep1() : validateStep2()
    if (err) { setError(err); return }
    setStep((s) => s + 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { user, error: signUpError } = await authService.signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        gender: form.gender,
        country: form.country,
        birthDate: form.birthDate,
      })

      if (signUpError) {
        const msg = signUpError.message ?? ''
        if (msg.includes('already registered')) setError('이미 사용 중인 이메일입니다.')
        else setError(msg || '회원가입에 실패했습니다.')
        return
      }

      if (user) {
        // 추가 프로필 업데이트 (bio, interests)
        const updates: any = {}
        if (form.bio.trim()) updates.bio = form.bio.trim()
        if (form.interests.length > 0) updates.interests = form.interests

        // 프로필 사진 업로드
        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop()
          const path = `${user.id}/avatar.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true })
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
            updates.avatar_url = publicUrl
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', user.id)
        }

        // creator_profiles 생성
        await supabase.from('creator_profiles').upsert({
          id: user.id,
          display_name: form.fullName,
          category: 'lifestyle',
          is_creator: true,
        })

        router.push('/signup/verify-email')
      }
    } catch {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    const p = form.password
    if (!p) return 0
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
  })()

  const strengthLabel = ['', '약함', '보통', '강함', '매우 강함'][passwordStrength]
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400'][passwordStrength]

  const STEPS = ['계정 정보', '개인 정보', '프로필 설정']

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>

      <div className="w-full max-w-md relative">
        {/* 로고 */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              FanWorld
            </h1>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 p-8">
          {/* 스텝 인디케이터 */}
          <div className="flex items-center mb-8">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i + 1 < step ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' :
                    i + 1 === step ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white ring-4 ring-pink-100' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i + 1 < step ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs mt-1 whitespace-nowrap ${i + 1 === step ? 'text-pink-500 font-medium' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 ${i + 1 < step ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-2xl text-sm">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* ─── 스텝 1: 계정 정보 ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="example@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="영문+숫자 8자 이상"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-gray-50/50"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showPassword ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'} />
                    </svg>
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full ${i <= passwordStrength ? strengthColor : 'bg-gray-100'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">강도: <span className={`font-medium ${passwordStrength >= 3 ? 'text-green-600' : passwordStrength === 2 ? 'text-yellow-600' : 'text-red-600'}`}>{strengthLabel}</span></p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호 확인</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 재입력"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-gray-50/50 ${confirmPassword && form.password !== confirmPassword ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {confirmPassword && form.password === confirmPassword && (
                    <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              {/* 이용약관 */}
              <label className="flex items-start gap-3 cursor-pointer">
                <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${agreed ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}
                  onClick={() => setAgreed(!agreed)}>
                  {agreed && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </div>
                <span className="text-sm text-gray-600">
                  <Link href="/terms" className="text-pink-500 hover:underline font-medium">이용약관</Link>과{' '}
                  <Link href="/privacy" className="text-pink-500 hover:underline font-medium">개인정보처리방침</Link>에 동의합니다
                </span>
              </label>

              <button onClick={goNext} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-md mt-2">
                다음 단계
              </button>
            </div>
          )}

          {/* ─── 스텝 2: 개인 정보 ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">이름</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['female', 'male'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => update('gender', g)}
                      className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${form.gender === g ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {g === 'female' ? '👩 여성' : '👨 남성'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">생년월일</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => update('birthDate', e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-gray-50/50"
                />
                <p className="text-xs text-gray-400 mt-1">만 18세 이상만 가입 가능합니다</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">국가</label>
                <select
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-gray-50/50"
                >
                  <option value="">국가 선택</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all">
                  이전
                </button>
                <button type="button" onClick={goNext} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-md">
                  다음
                </button>
              </div>
            </div>
          )}

          {/* ─── 스텝 3: 프로필 설정 ─── */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 프로필 사진 */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-pink-200 to-purple-200 cursor-pointer group"
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-400">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500">프로필 사진 선택 <span className="text-gray-400">(선택)</span></p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>

              {/* 소개 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  자기소개 <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  placeholder="자신을 소개해 주세요..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-gray-50/50 resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{form.bio.length}/200</p>
              </div>

              {/* 관심사 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  관심사 <span className="text-gray-400 font-normal">(최대 8개)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        form.interests.includes(interest)
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all">
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      가입 중...
                    </span>
                  ) : '가입 완료'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-pink-500 hover:text-pink-600">로그인</Link>
        </p>
      </div>
    </div>
  )
}
