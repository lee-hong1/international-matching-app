'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

const CONTENT = {
  ko: {
    title: '개인정보처리방침',
    lastUpdated: '최종 수정일: 2024년 1월 1일',
    sections: [
      {
        heading: '1. 수집하는 개인정보',
        body: '플랫폼은 서비스 제공을 위해 다음 개인정보를 수집합니다: 이름, 이메일, 생년월일, 국적, 프로필 사진, 위치 정보(선택), 결제 정보(암호화 처리).',
      },
      {
        heading: '2. 개인정보 이용 목적',
        body: '수집된 개인정보는 회원 관리, 서비스 제공, 매칭 서비스, 결제 처리, 고객 지원, 법적 의무 이행에만 사용됩니다.',
      },
      {
        heading: '3. 개인정보 보유 기간',
        body: '회원 탈퇴 시 즉시 삭제됩니다. 단, 전자상거래법에 따라 거래 기록은 5년간 보관됩니다.',
      },
      {
        heading: '4. 제3자 제공',
        body: '이용자의 동의 없이 제3자에게 개인정보를 제공하지 않습니다. 단, 법령에 의한 경우는 예외입니다.',
      },
      {
        heading: '5. 이용자 권리 (GDPR)',
        body: '이용자는 열람권, 정정권, 삭제권(잊힐 권리), 처리 제한권, 이동권을 갖습니다. 삭제 요청: support@globalmatch.app로 이메일을 보내주세요. 7영업일 이내 처리합니다.',
      },
      {
        heading: '6. 쿠키 및 추적',
        body: '서비스 개선을 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키를 비활성화할 수 있으나 일부 서비스 이용이 제한될 수 있습니다.',
      },
      {
        heading: '7. 개인정보 보호책임자',
        body: '개인정보 관련 문의는 support@globalmatch.app로 연락해 주세요.',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: January 1, 2024',
    sections: [
      { heading: '1. Data We Collect', body: 'We collect: name, email, date of birth, nationality, profile photo, location (optional), payment information (encrypted).' },
      { heading: '2. Purpose of Processing', body: 'Collected data is used only for: account management, service provision, matchmaking, payment processing, customer support, and legal obligations.' },
      { heading: '3. Retention Period', body: 'Data is deleted immediately upon account deletion. Transaction records are retained for 5 years per applicable e-commerce law.' },
      { heading: '4. Third-Party Sharing', body: 'We do not share personal data with third parties without your consent, except as required by law.' },
      { heading: '5. Your Rights (GDPR)', body: 'You have the right to access, correct, delete (right to erasure), restrict processing, and data portability. To request deletion, email support@globalmatch.app. We will respond within 7 business days.' },
      { heading: '6. Cookies', body: 'We use cookies to improve our service. You may disable cookies in your browser, but some features may be limited.' },
      { heading: '7. Data Protection Officer', body: 'For privacy inquiries, contact support@globalmatch.app.' },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    lastUpdated: '最終更新日: 2024年1月1日',
    sections: [
      { heading: '1. 収集する個人情報', body: '氏名、メールアドレス、生年月日、国籍、プロフィール写真、位置情報（任意）、決済情報（暗号化）を収集します。' },
      { heading: '2. 利用目的', body: '収集した情報はアカウント管理、サービス提供、マッチング、決済処理、カスタマーサポート、法的義務の履行にのみ使用します。' },
      { heading: '3. 保存期間', body: 'アカウント削除時に即時削除します。取引記録は法律に基づき5年間保存します。' },
      { heading: '4. 第三者提供', body: '同意なく第三者に個人情報を提供しません（法令による場合を除く）。' },
      { heading: '5. お客様の権利（GDPR）', body: 'アクセス権、訂正権、削除権（忘れられる権利）、処理制限権、ポータビリティ権があります。削除依頼: support@globalmatch.app' },
      { heading: '6. クッキー', body: 'サービス改善のためクッキーを使用します。ブラウザ設定で無効にできます。' },
      { heading: '7. 個人情報保護担当', body: 'お問い合わせ: support@globalmatch.app' },
    ],
  },
  zh: {
    title: '隐私政策',
    lastUpdated: '最后更新: 2024年1月1日',
    sections: [
      { heading: '1. 我们收集的信息', body: '我们收集: 姓名、电子邮件、出生日期、国籍、头像、位置（可选）、支付信息（已加密）。' },
      { heading: '2. 处理目的', body: '收集的数据仅用于账户管理、服务提供、配对、支付处理、客户支持和法律义务。' },
      { heading: '3. 保存期限', body: '账户删除时立即删除数据。交易记录根据适用电商法律保留5年。' },
      { heading: '4. 第三方共享', body: '未经您同意，我们不会与第三方共享个人数据（法律要求除外）。' },
      { heading: '5. 您的权利（GDPR）', body: '您有权访问、更正、删除（被遗忘权）、限制处理和数据可携带。删除请求: support@globalmatch.app' },
      { heading: '6. Cookie', body: '我们使用Cookie改善服务。您可以在浏览器设置中禁用Cookie。' },
      { heading: '7. 数据保护', body: '隐私咨询请联系: support@globalmatch.app' },
    ],
  },
}

export default function PrivacyPage() {
  const { locale } = useLanguage()
  const lang = (locale as keyof typeof CONTENT) in CONTENT ? (locale as keyof typeof CONTENT) : 'ko'
  const content = CONTENT[lang]

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          <Link href="/signup" className="text-sm text-purple-600 hover:underline">← 뒤로 / Back</Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <p className="text-sm text-gray-500 mb-8">{content.lastUpdated}</p>
        <div className="space-y-6">
          {content.sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-base font-semibold text-gray-800 mb-2">{s.heading}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-500">
          <p>GlobalMatch | support@globalmatch.app</p>
        </div>
      </div>
    </div>
  )
}
