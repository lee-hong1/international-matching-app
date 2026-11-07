'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { detectLangFromNavigator, t } from '@src/lib/i18n'

export default function VerifyEmailPage() {
  const [lang, setLang] = useState<'ko' | 'en' | 'ja' | 'zh'>('ko')

  useEffect(() => {
    setLang(detectLangFromNavigator())
  }, [])

  const content = {
    ko: {
      title: '이메일을 확인해 주세요',
      subtitle: '거의 다 왔어요!',
      desc: '가입하신 이메일로 인증 링크를 보냈습니다.\n링크를 클릭하면 가입이 완료됩니다.',
      spam: '이메일이 보이지 않으면 스팸함을 확인해 주세요.',
      login: '로그인 화면으로',
      resend: '이메일 재발송은 로그인 화면에서 가능합니다.',
    },
    en: {
      title: 'Check your email',
      subtitle: 'Almost there!',
      desc: 'We sent a verification link to your email.\nClick the link to complete your registration.',
      spam: "Can't find the email? Check your spam folder.",
      login: 'Go to login',
      resend: 'You can resend the email from the login screen.',
    },
    ja: {
      title: 'メールを確認してください',
      subtitle: 'もう少しです！',
      desc: '登録したメールアドレスに認証リンクを送りました。\nリンクをクリックして登録を完了してください。',
      spam: 'メールが届かない場合は迷惑メールフォルダをご確認ください。',
      login: 'ログイン画面へ',
      resend: 'メールの再送信はログイン画面から行えます。',
    },
    zh: {
      title: '请查看您的邮件',
      subtitle: '快完成了！',
      desc: '我们已向您的邮箱发送了验证链接。\n点击链接即可完成注册。',
      spam: '找不到邮件？请检查垃圾邮件文件夹。',
      login: '前往登录页面',
      resend: '您可以在登录页面重新发送邮件。',
    },
  }

  const c = content[lang] ?? content.ko

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>

      <div className="w-full max-w-md relative text-center">
        <div className="mb-6">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              FanWorld
            </h1>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 p-8">
          {/* 아이콘 */}
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <p className="text-sm font-medium text-pink-500 mb-2">{c.subtitle}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{c.title}</h2>

          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line mb-4">{c.desc}</p>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
            <p className="text-xs text-amber-700">{c.spam}</p>
          </div>

          <Link
            href="/login"
            className="block w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-md text-sm"
          >
            {c.login}
          </Link>

          <p className="text-xs text-gray-400 mt-4">{c.resend}</p>
        </div>
      </div>
    </div>
  )
}
