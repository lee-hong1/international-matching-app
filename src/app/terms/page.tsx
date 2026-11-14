'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

const CONTENT = {
  ko: {
    title: '이용약관',
    lastUpdated: '최종 수정일: 2024년 1월 1일',
    sections: [
      {
        heading: '제1조 (목적)',
        body: '이 약관은 GlobalMatch(이하 "플랫폼")가 제공하는 국제 이성 만남 중개 서비스의 이용에 관한 조건 및 절차, 플랫폼과 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.',
      },
      {
        heading: '제2조 (이용자 자격)',
        body: '서비스는 만 19세 이상의 성인만 이용 가능합니다. 가입 시 생년월일 인증이 필요하며, 허위 정보 제공 시 계정이 즉시 정지됩니다.',
      },
      {
        heading: '제3조 (플랫폼의 역할)',
        body: 'GlobalMatch는 통신판매중개업자로서, 호스트(서비스 제공자)와 이용자 간의 계약 체결을 중개합니다. 플랫폼은 호스트가 제공하는 서비스의 품질에 대해 직접적인 책임을 지지 않으나, 분쟁 중재 및 환불 보장의 책임을 집니다.',
      },
      {
        heading: '제4조 (서비스 이용)',
        body: '온라인 서비스(영상통화 등)는 플랫폼 내 채널을 통해서만 제공되어야 합니다. 외부 플랫폼(Zoom, KakaoTalk 등)으로의 유도는 계정 정지 사유입니다. 녹화는 양측의 명시적 동의 후에만 허용됩니다.',
      },
      {
        heading: '제5조 (결제, 청약철회 및 환불)',
        body: '결제는 등록된 결제 수단을 통해 처리됩니다. 전자상거래법 제17조에 따라 디지털 콘텐츠·예약 서비스 이용 전 7일 이내 청약철회(취소)가 가능하며 전액 환불합니다. 서비스 시작 후 취소 시 호스트 환불 정책에 따릅니다. 플랫폼은 에스크로 방식으로 결제금을 보호합니다.',
      },
      {
        heading: '제6조 (금지 행위)',
        body: '다음 행위는 엄격히 금지됩니다: (1) 미성년자 접근 시도, (2) 성매매 또는 불법 행위 유도, (3) 개인정보 무단 수집, (4) 허위 정보 제공, (5) 플랫폼 외부 거래 유도.',
      },
      {
        heading: '제7조 (개인정보 처리)',
        body: '플랫폼은 개인정보보호법 및 GDPR에 따라 이용자의 개인정보를 처리합니다. 이용자는 언제든지 개인정보 삭제를 요청할 수 있습니다 (GDPR 제17조 삭제권). 문의: support@globalmatch.app',
      },
      {
        heading: '제8조 (분쟁 해결)',
        body: '분쟁 발생 시 플랫폼은 7영업일 이내 답변을 제공합니다. 한국 이용자의 경우 대한민국 법률이 적용됩니다.',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: January 1, 2024',
    sections: [
      {
        heading: 'Article 1 (Purpose)',
        body: 'These Terms govern the use of GlobalMatch\'s international matchmaking platform services, including the rights, obligations, and responsibilities between the platform and users.',
      },
      {
        heading: 'Article 2 (Eligibility)',
        body: 'The service is available only to adults aged 19 and over. Age verification is required at registration. Providing false information will result in immediate account suspension.',
      },
      {
        heading: 'Article 3 (Platform Role)',
        body: 'GlobalMatch acts as an online marketplace intermediary, facilitating contracts between hosts (service providers) and users. The platform is not directly responsible for host service quality but guarantees dispute resolution and refund protection.',
      },
      {
        heading: 'Article 4 (Service Use)',
        body: 'Online services (video calls, etc.) must be provided only through the platform\'s built-in channels. Directing users to external platforms (Zoom, KakaoTalk, etc.) is grounds for account suspension. Recording is only permitted with explicit consent from both parties.',
      },
      {
        heading: 'Article 5 (Payment, Withdrawal and Refunds)',
        body: 'Payments are processed through registered payment methods. Under the Korean E-Commerce Act §17 (전자상거래법), users may withdraw (cancel) within 7 days before service commencement for a full refund. After service starts, the host\'s refund policy applies. The platform protects payments via escrow.',
      },
      {
        heading: 'Article 6 (Prohibited Conduct)',
        body: 'The following are strictly prohibited: (1) Attempts to access the service by minors, (2) Solicitation for prostitution or illegal activities, (3) Unauthorized collection of personal data, (4) Providing false information, (5) Off-platform transactions.',
      },
      {
        heading: 'Article 7 (Privacy)',
        body: 'The platform processes personal data in accordance with applicable privacy laws including GDPR. Users may request deletion of their personal data at any time (GDPR Art. 17 Right to Erasure). Contact: support@globalmatch.app',
      },
      {
        heading: 'Article 8 (Disputes)',
        body: 'The platform will respond to disputes within 7 business days. Korean law applies for users in South Korea.',
      },
    ],
  },
  ja: {
    title: '利用規約',
    lastUpdated: '最終更新日: 2024年1月1日',
    sections: [
      { heading: '第1条（目的）', body: 'この規約はGlobalMatch（以下「プラットフォーム」）が提供する国際マッチングサービスの利用に関する条件及び手続き、プラットフォームと利用者間の権利・義務を規定します。' },
      { heading: '第2条（利用資格）', body: 'サービスは19歳以上の成人のみご利用いただけます。登録時に年齢確認が必要です。虚偽情報の提供はアカウントの即時停止につながります。' },
      { heading: '第3条（プラットフォームの役割）', body: 'GlobalMatchは通信販売仲介業者として、ホスト（サービス提供者）と利用者間の契約締結を仲介します。分争仲裁及び返金保証の責任を負います。' },
      { heading: '第4条（サービス利用）', body: 'オンラインサービスはプラットフォーム内チャンネルのみで提供されます。外部プラットフォームへの誘導はアカウント停止事由です。録画は両者の明示的同意後のみ許可されます。' },
      { heading: '第5条（支払い・クーリングオフ・返金）', body: '電子商取引法§17に基づき、サービス開始前7日以内はキャンセル（クーリングオフ）が可能で全額返金します。開始後はホストの返金ポリシーに従います。プラットフォームはエスクロー方式で支払いを保護します。' },
      { heading: '第6条（禁止行為）', body: '未成年者のアクセス試み、売春・違法行為への誘導、個人情報の無断収集、虚偽情報の提供、プラットフォーム外取引への誘導は厳禁です。' },
      { heading: '第7条（個人情報）', body: 'GDPRを含む適用法に基づき個人情報を処理します。いつでも個人情報削除を要求できます（GDPR第17条）。お問い合わせ: support@globalmatch.app' },
      { heading: '第8条（紛争解決）', body: 'プラットフォームは7営業日以内に紛争に対応します。' },
    ],
  },
  zh: {
    title: '使用条款',
    lastUpdated: '最后更新: 2024年1月1日',
    sections: [
      { heading: '第一条（目的）', body: '本条款规定GlobalMatch（以下称"平台"）提供的国际交友中介服务的使用条件及平台与用户之间的权利义务。' },
      { heading: '第二条（使用资格）', body: '服务仅限19周岁及以上成年人使用。注册时需进行年龄验证。提供虚假信息将导致账户立即暂停。' },
      { heading: '第三条（平台角色）', body: 'GlobalMatch作为网络交易中介，促进主机（服务提供者）与用户之间的合同签订。平台对纠纷调解和退款保障负责。' },
      { heading: '第四条（服务使用）', body: '在线服务必须仅通过平台内置频道提供。引导用户至外部平台是账户暂停的理由。仅在双方明确同意后方可录制。' },
      { heading: '第五条（付款、撤回权与退款）', body: '依据韩国电子商务法§17，服务开始前7日内可撤回订单并全额退款。服务开始后按主机退款政策处理。平台以托管方式保护付款。' },
      { heading: '第六条（禁止行为）', body: '严禁：未成年人访问尝试、卖淫或非法活动引导、未授权收集个人信息、提供虚假信息、平台外交易引导。' },
      { heading: '第七条（隐私）', body: '根据包括GDPR在内的适用法律处理个人数据。用户可随时请求删除个人数据（GDPR第17条）。联系: support@globalmatch.app' },
      { heading: '第八条（纠纷解决）', body: '平台将在7个工作日内回应纠纷。' },
    ],
  },
}

export default function TermsPage() {
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
