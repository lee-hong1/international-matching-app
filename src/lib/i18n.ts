/**
 * 경량 i18n 유틸리티.
 * 외부 라이브러리 없이 ko/en/ja/zh 4개 언어 지원.
 *
 * 서버: Accept-Language 헤더에서 감지
 * 클라이언트: navigator.language 에서 감지
 */

export type Lang = 'ko' | 'en' | 'ja' | 'zh'
export type Messages = Record<string, Record<Lang, string>>

const MESSAGES: Messages = {
  // ── 호스트 프로필 카드 ──────────────────────────────────────────────────
  'profile.host_since': {
    ko: '호스트 등록일',
    en: 'Host since',
    ja: 'ホスト登録日',
    zh: '主持人注册日期',
  },
  'profile.reviews': {
    ko: '리뷰',
    en: 'reviews',
    ja: 'レビュー',
    zh: '评价',
  },
  'profile.verified': {
    ko: '인증됨',
    en: 'Verified',
    ja: '認証済み',
    zh: '已认证',
  },
  'profile.premium': {
    ko: '프리미엄',
    en: 'Premium',
    ja: 'プレミアム',
    zh: '高级会员',
  },
  'profile.elite': {
    ko: '엘리트',
    en: 'Elite',
    ja: 'エリート',
    zh: '精英会员',
  },
  'profile.book_now': {
    ko: '예약하기',
    en: 'Book Now',
    ja: '予約する',
    zh: '立即预约',
  },
  'profile.send_message': {
    ko: '메시지 보내기',
    en: 'Send Message',
    ja: 'メッセージを送る',
    zh: '发送消息',
  },
  // ── 예약 ──────────────────────────────────────────────────────────────
  'booking.confirmed': {
    ko: '예약 확정',
    en: 'Booking Confirmed',
    ja: '予約確定',
    zh: '预约已确认',
  },
  'booking.cancelled': {
    ko: '예약 취소',
    en: 'Booking Cancelled',
    ja: '予約キャンセル',
    zh: '预约已取消',
  },
  'booking.pending': {
    ko: '예약 대기',
    en: 'Pending',
    ja: '承認待ち',
    zh: '等待确认',
  },
  // ── 에러 메시지 ────────────────────────────────────────────────────────
  'error.generic': {
    ko: '오류가 발생했습니다.',
    en: 'An error occurred.',
    ja: 'エラーが発生しました。',
    zh: '发生了错误。',
  },
  'error.network': {
    ko: '네트워크 오류가 발생했습니다.',
    en: 'Network error occurred.',
    ja: 'ネットワークエラーが発生しました。',
    zh: '网络错误。',
  },
  // ── 쇼핑 / 이벤트 ─────────────────────────────────────────────────────
  'shop.buy_now': {
    ko: '구매하기',
    en: 'Buy Now',
    ja: '購入する',
    zh: '立即购买',
  },
  'shop.event_ongoing': {
    ko: '진행 중',
    en: 'Ongoing',
    ja: '開催中',
    zh: '进行中',
  },
  'shop.event_ended': {
    ko: '종료',
    en: 'Ended',
    ja: '終了',
    zh: '已结束',
  },
  // ── 발견 (Discover) 페이지 ────────────────────────────────────────────────
  'discover.all_seen': {
    ko: '모든 프로필을 확인했습니다!',
    en: "You've seen all profiles!",
    ja: 'すべてのプロフィールを確認しました！',
    zh: '您已查看所有档案！',
  },
  'discover.check_later': {
    ko: '새로운 추천을 받으려면 잠시 후 다시 확인해주세요.',
    en: 'Check back later for new recommendations.',
    ja: '新しいおすすめは後でご確認ください。',
    zh: '稍后再来查看新推荐。',
  },
  'discover.reload': {
    ko: '다시 로드하기',
    en: 'Reload',
    ja: '再読み込み',
    zh: '重新加载',
  },
  'discover.swipe_hint': {
    ko: '카드를 좌우로 스와이프하거나 버튼을 눌러 선택하세요',
    en: 'Swipe cards left or right, or use the buttons',
    ja: 'カードを左右にスワイプするかボタンで選択してください',
    zh: '左右滑动卡片或点击按钮进行选择',
  },
  'discover.match_success': {
    ko: '매칭 성공!',
    en: "It's a Match!",
    ja: 'マッチング成功！',
    zh: '配对成功！',
  },
  'discover.keep_exploring': {
    ko: '계속 탐색',
    en: 'Keep Exploring',
    ja: '探索を続ける',
    zh: '继续探索',
  },
  // ── 랜딩 페이지 ────────────────────────────────────────────────────────
  'landing.login': {
    ko: '로그인',
    en: 'Log in',
    ja: 'ログイン',
    zh: '登录',
  },
  'landing.signup': {
    ko: '회원가입',
    en: 'Sign up',
    ja: '新規登録',
    zh: '注册',
  },
  'landing.hero_title': {
    ko: '전 세계의 특별한 인연을 만나보세요',
    en: 'Meet Your Special Connection Worldwide',
    ja: '世界中で特別な出会いを',
    zh: '在全球遇见您的特别缘分',
  },
  'landing.hero_subtitle': {
    ko: '유럽, 러시아, 남미, 북미의 여성들과 한국 남성을 연결하는 신뢰할 수 있는 국제 매칭 플랫폼입니다.',
    en: 'A trusted international matching platform connecting women from Europe, Russia, Latin America, and North America with Korean men.',
    ja: 'ヨーロッパ、ロシア、南米、北米の女性と韓国人男性をつなぐ、信頼できる国際マッチングプラットフォームです。',
    zh: '值得信赖的国际配对平台，连接来自欧洲、俄罗斯、拉丁美洲和北美的女性与韩国男性。',
  },
  'landing.cta_start': {
    ko: '무료로 시작하기',
    en: 'Get Started Free',
    ja: '無料で始める',
    zh: '免费开始',
  },
  'landing.cta_learn': {
    ko: '서비스 소개',
    en: 'How It Works',
    ja: 'サービス紹介',
    zh: '了解服务',
  },
  'landing.feature_network': {
    ko: '전 세계 네트워크',
    en: 'Global Network',
    ja: 'グローバルネットワーク',
    zh: '全球网络',
  },
  'landing.feature_network_desc': {
    ko: '유럽, 러시아, 남미, 북미의 검증된 여성 회원들과 만나보세요',
    en: 'Meet verified female members from Europe, Russia, Latin America, and North America',
    ja: 'ヨーロッパ、ロシア、南米、北米の認証済み女性会員と出会えます',
    zh: '与来自欧洲、俄罗斯、拉丁美洲和北美的认证女性会员相遇',
  },
  'landing.feature_safe': {
    ko: '안전한 환경',
    en: 'Safe Environment',
    ja: '安全な環境',
    zh: '安全环境',
  },
  'landing.feature_safe_desc': {
    ko: '신원 확인과 보안 시스템으로 안전하고 신뢰할 수 있는 만남',
    en: 'Safe and trustworthy meetings with identity verification and security systems',
    ja: '身元確認とセキュリティシステムで安全・信頼できる出会い',
    zh: '通过身份验证和安全系统实现安全可信的会面',
  },
  'landing.feature_realtime': {
    ko: '실시간 소통',
    en: 'Real-time Communication',
    ja: 'リアルタイムコミュニケーション',
    zh: '实时沟通',
  },
  'landing.feature_realtime_desc': {
    ko: '번역 기능과 화상 통화로 언어 장벽 없는 자연스러운 대화',
    en: 'Natural conversations without language barriers via translation and video calls',
    ja: '翻訳機能とビデオ通話で言語の壁なく自然な会話',
    zh: '通过翻译功能和视频通话，消除语言障碍的自然对话',
  },
  'landing.stat_members': {
    ko: '활성 여성 회원',
    en: 'Active Female Members',
    ja: 'アクティブな女性会員',
    zh: '活跃女性会员',
  },
  'landing.stat_countries': {
    ko: '국가',
    en: 'Countries',
    ja: '国',
    zh: '国家',
  },
  'landing.stat_matches': {
    ko: '성공적인 매칭',
    en: 'Successful Matches',
    ja: '成功したマッチング',
    zh: '成功配对',
  },
  'landing.stat_support': {
    ko: '고객 지원',
    en: 'Customer Support',
    ja: 'カスタマーサポート',
    zh: '客户支持',
  },
  'landing.footer_tagline': {
    ko: '신뢰할 수 있는 국제 매칭 서비스',
    en: 'A trusted international matching service',
    ja: '信頼できる国際マッチングサービス',
    zh: '值得信赖的国际配对服务',
  },
  'landing.footer_service': {
    ko: '서비스',
    en: 'Services',
    ja: 'サービス',
    zh: '服务',
  },
  'landing.footer_matching': {
    ko: '매칭 서비스',
    en: 'Matching Service',
    ja: 'マッチングサービス',
    zh: '配对服务',
  },
  'landing.footer_premium': {
    ko: '프리미엄 플랜',
    en: 'Premium Plan',
    ja: 'プレミアムプラン',
    zh: '高级计划',
  },
  'landing.footer_safety': {
    ko: '안전 가이드',
    en: 'Safety Guide',
    ja: '安全ガイド',
    zh: '安全指南',
  },
  'landing.footer_support': {
    ko: '고객지원',
    en: 'Support',
    ja: 'サポート',
    zh: '客户支持',
  },
  'landing.footer_help': {
    ko: '도움말',
    en: 'Help',
    ja: 'ヘルプ',
    zh: '帮助',
  },
  'landing.footer_contact': {
    ko: '문의하기',
    en: 'Contact Us',
    ja: 'お問い合わせ',
    zh: '联系我们',
  },
  'landing.footer_faq': {
    ko: '자주 묻는 질문',
    en: 'FAQ',
    ja: 'よくある質問',
    zh: '常见问题',
  },
  'landing.footer_company': {
    ko: '회사',
    en: 'Company',
    ja: '会社',
    zh: '公司',
  },
  'landing.footer_about': {
    ko: '회사 소개',
    en: 'About Us',
    ja: '会社概要',
    zh: '关于我们',
  },
  'landing.footer_privacy': {
    ko: '개인정보처리방침',
    en: 'Privacy Policy',
    ja: 'プライバシーポリシー',
    zh: '隐私政策',
  },
  'landing.footer_terms': {
    ko: '이용약관',
    en: 'Terms of Service',
    ja: '利用規約',
    zh: '服务条款',
  },
  // ── WebRTC ─────────────────────────────────────────────────────────────
  'webrtc.connection_unstable': {
    ko: '연결이 불안정합니다.',
    en: 'Connection is unstable.',
    ja: '接続が不安定です。',
    zh: '连接不稳定。',
  },
  'webrtc.chat_only_mode': {
    ko: '영상 연결 실패. 채팅으로 전환합니다.',
    en: 'Video connection failed. Switching to chat.',
    ja: '映像接続に失敗しました。チャットに切り替えます。',
    zh: '视频连接失败，切换到聊天模式。',
  },
  'webrtc.retry': {
    ko: '다시 연결',
    en: 'Reconnect',
    ja: '再接続',
    zh: '重新连接',
  },

  // ── auth pages ────────────────────────────────────────────────────────────
  'auth.login_title': { ko: '로그인', en: 'Sign In', ja: 'ログイン', zh: '登录' },
  'auth.signup_title': { ko: '회원가입', en: 'Sign Up', ja: '新規登録', zh: '注册' },
  'auth.email_label': { ko: '이메일', en: 'Email', ja: 'メールアドレス', zh: '电子邮件' },
  'auth.password_label': { ko: '비밀번호', en: 'Password', ja: 'パスワード', zh: '密码' },
  'auth.login_button': { ko: '로그인', en: 'Sign In', ja: 'ログイン', zh: '登录' },
  'auth.signup_button': { ko: '회원가입', en: 'Create Account', ja: 'アカウント作成', zh: '创建账号' },
  'auth.login_loading': { ko: '로그인 중...', en: 'Signing in...', ja: 'ログイン中...', zh: '登录中...' },
  'auth.signup_loading': { ko: '가입 중...', en: 'Creating account...', ja: '登録中...', zh: '注册中...' },
  'auth.or_social': { ko: '또는 소셜 계정으로 계속', en: 'Or continue with', ja: 'またはソーシャルアカウントで', zh: '或使用社交账号' },
  'auth.no_account': { ko: '계정이 없으신가요?', en: "Don't have an account?", ja: 'アカウントがない方は', zh: '没有账号？' },
  'auth.have_account': { ko: '이미 계정이 있으신가요?', en: 'Already have an account?', ja: 'アカウントをお持ちの方は', zh: '已有账号？' },
  'auth.signup_link': { ko: '회원가입', en: 'Sign up', ja: '新規登録', zh: '注册' },
  'auth.login_link': { ko: '로그인', en: 'Sign in', ja: 'ログイン', zh: '登录' },
  'auth.forgot_password': { ko: '비밀번호를 잊으셨나요?', en: 'Forgot password?', ja: 'パスワードを忘れた方', zh: '忘记密码？' },
  'auth.error_empty_fields': { ko: '이메일과 비밀번호를 입력하세요.', en: 'Please enter email and password.', ja: 'メールとパスワードを入力してください。', zh: '请输入邮箱和密码。' },
  'auth.error_invalid_credentials': { ko: '이메일 또는 비밀번호가 올바르지 않습니다.', en: 'Invalid email or password.', ja: 'メールまたはパスワードが正しくありません。', zh: '邮箱或密码不正确。' },
  'auth.error_email_not_confirmed': { ko: '이메일 인증을 완료해 주세요.', en: 'Please confirm your email address.', ja: 'メールアドレスの確認を完了してください。', zh: '请验证您的电子邮件地址。' },
  'auth.error_login_failed': { ko: '로그인에 실패했습니다. 다시 시도해 주세요.', en: 'Login failed. Please try again.', ja: 'ログインに失敗しました。再試行してください。', zh: '登录失败，请重试。' },
  'auth.error_login_error': { ko: '로그인 중 오류가 발생했습니다.', en: 'An error occurred during login.', ja: 'ログイン中にエラーが発生しました。', zh: '登录时发生错误。' },
  'auth.error_social_failed': { ko: '소셜 로그인에 실패했습니다.', en: 'Social login failed.', ja: 'ソーシャルログインに失敗しました。', zh: '社交登录失败。' },
  'auth.error_social_error': { ko: '소셜 로그인 중 오류가 발생했습니다.', en: 'An error occurred during social login.', ja: 'ソーシャルログイン中にエラーが発生しました。', zh: '社交登录时发生错误。' },
}

/** 언어 코드를 지원 언어로 정규화 */
export function normalizeLang(raw: string | null | undefined): Lang {
  if (!raw) return 'ko'
  const prefix = raw.split('-')[0].toLowerCase()
  if (prefix === 'ja') return 'ja'
  if (prefix === 'zh') return 'zh'
  if (prefix === 'en') return 'en'
  return 'ko'
}

/** Accept-Language 헤더에서 언어 감지 (서버사이드) */
export function detectLangFromHeader(acceptLanguage: string | null): Lang {
  return normalizeLang(acceptLanguage?.split(',')[0].trim())
}

/** 클라이언트에서 사용: navigator.language 기반 */
export function detectLangFromNavigator(): Lang {
  if (typeof navigator === 'undefined') return 'ko'
  return normalizeLang(navigator.language)
}

  // ── 회원가입 ──────────────────────────────────────────────────────────────
  'signup.title': { ko: '회원가입', en: 'Sign Up', ja: '新規登録', zh: '注册' },
  'signup.step_account': { ko: '계정 정보', en: 'Account Info', ja: 'アカウント情報', zh: '账户信息' },
  'signup.step_personal': { ko: '개인 정보', en: 'Personal Info', ja: '個人情報', zh: '个人信息' },
  'signup.step_profile': { ko: '프로필 설정', en: 'Profile Setup', ja: 'プロフィール設定', zh: '个人档案' },
  'signup.email_placeholder': { ko: '이메일 주소', en: 'Email address', ja: 'メールアドレス', zh: '电子邮箱' },
  'signup.password_placeholder': { ko: '영문+숫자 8자 이상', en: '8+ chars with letter & number', ja: '英数字8文字以上', zh: '8位以上含字母和数字' },
  'signup.confirm_password': { ko: '비밀번호 재입력', en: 'Confirm password', ja: 'パスワード確認', zh: '确认密码' },
  'signup.name_placeholder': { ko: '이름을 입력하세요', en: 'Enter your name', ja: '名前を入力', zh: '输入姓名' },
  'signup.bio_placeholder': { ko: '자신을 소개해 주세요...', en: 'Tell us about yourself...', ja: '自己紹介...', zh: '介绍一下自己...' },
  'signup.submit': { ko: '가입 완료', en: 'Complete Sign Up', ja: '登録完了', zh: '完成注册' },
  'signup.err_email_required': { ko: '이메일을 입력하세요.', en: 'Email is required.', ja: 'メールを入力してください。', zh: '请输入邮箱。' },
  'signup.err_email_invalid': { ko: '올바른 이메일 형식을 입력하세요.', en: 'Enter a valid email.', ja: '正しいメール形式を入力してください。', zh: '请输入有效的邮箱格式。' },
  'signup.err_password_required': { ko: '비밀번호를 입력하세요.', en: 'Password is required.', ja: 'パスワードを入力してください。', zh: '请输入密码。' },
  'signup.err_password_short': { ko: '비밀번호는 최소 8자 이상이어야 합니다.', en: 'Password must be at least 8 characters.', ja: 'パスワードは8文字以上必要です。', zh: '密码至少需要8个字符。' },
  'signup.err_password_weak': { ko: '비밀번호는 영문과 숫자를 포함해야 합니다.', en: 'Password must include letters and numbers.', ja: 'パスワードは英字と数字を含む必要があります。', zh: '密码必须包含字母和数字。' },
  'signup.err_password_mismatch': { ko: '비밀번호가 일치하지 않습니다.', en: 'Passwords do not match.', ja: 'パスワードが一致しません。', zh: '密码不匹配。' },
  'signup.err_terms': { ko: '이용약관에 동의해 주세요.', en: 'Please agree to the terms.', ja: '利用規約に同意してください。', zh: '请同意使用条款。' },
  'signup.err_name_required': { ko: '이름을 입력하세요.', en: 'Name is required.', ja: '名前を入力してください。', zh: '请输入姓名。' },
  'signup.err_birthdate_required': { ko: '생년월일을 입력하세요.', en: 'Date of birth is required.', ja: '生年月日を入力してください。', zh: '请输入生日。' },
  'signup.err_country_required': { ko: '국가를 선택하세요.', en: 'Please select a country.', ja: '国を選択してください。', zh: '请选择国家。' },
  'signup.err_duplicate': { ko: '입력하신 정보로 가입을 진행할 수 없습니다. 이미 가입된 이메일이면 로그인을 이용해주세요.', en: 'Unable to sign up with this info. If already registered, please log in.', ja: 'この情報では登録できません。登録済みの場合はログインしてください。', zh: '无法用此信息注册。如已注册，请登录。' },
  'signup.err_generic': { ko: '회원가입에 실패했습니다.', en: 'Sign up failed.', ja: '登録に失敗しました。', zh: '注册失败。' },
  'signup.err_server': { ko: '회원가입 중 오류가 발생했습니다.', en: 'An error occurred during sign up.', ja: '登録中にエラーが発生しました。', zh: '注册时出错。' },
  'signup.strength_weak': { ko: '약함', en: 'Weak', ja: '弱い', zh: '弱' },
  'signup.strength_fair': { ko: '보통', en: 'Fair', ja: '普通', zh: '一般' },
  'signup.strength_strong': { ko: '강함', en: 'Strong', ja: '強い', zh: '强' },
  'signup.strength_very_strong': { ko: '매우 강함', en: 'Very Strong', ja: 'とても強い', zh: '非常强' },

  // ── 알림 메시지 (FCM push 본문) ──────────────────────────────────────────
  'notification.new_booking.title': {
    ko: '새 예약',
    en: 'New Booking',
    ja: '新しい予約',
    zh: '新预约',
  },
  'notification.new_booking.body': {
    ko: '{name}님이 {date}에 예약했습니다',
    en: '{name} booked for {date}',
    ja: '{name}さんが{date}に予約しました',
    zh: '{name}已预约{date}',
  },
  'notification.confirmed.title': {
    ko: '예약 확정',
    en: 'Booking Confirmed',
    ja: '予約確定',
    zh: '预约已确认',
  },
  'notification.confirmed.body': {
    ko: '{date} 예약이 확정되었습니다',
    en: 'Your booking for {date} has been confirmed',
    ja: '{date}の予約が確定しました',
    zh: '{date}的预约已确认',
  },
  'notification.cancelled.title': {
    ko: '예약 취소',
    en: 'Booking Cancelled',
    ja: '予約キャンセル',
    zh: '预约已取消',
  },
  'notification.cancelled.body': {
    ko: '{date} 예약이 취소되었습니다',
    en: 'The booking for {date} has been cancelled',
    ja: '{date}の予約がキャンセルされました',
    zh: '{date}的预约已取消',
  },
  'notification.completed.title': {
    ko: '서비스 완료',
    en: 'Service Completed',
    ja: 'サービス完了',
    zh: '服务已完成',
  },
  'notification.completed.body': {
    ko: '서비스가 완료되었습니다. 리뷰를 남겨보세요!',
    en: 'Service completed. Please leave a review!',
    ja: 'サービスが完了しました。レビューをお願いします！',
    zh: '服务已完成，请留下评价！',
  },
}

/**
 * 번역 조회.
 * 키가 없으면 key를 그대로 반환 (graceful fallback).
 * vars: 템플릿 변수 치환 ex) t('notification.new_booking.body', 'ko', { name: '김철수', date: '12/25' })
 */
export function t(key: string, lang: Lang, vars?: Record<string, string>): string {
  let msg = MESSAGES[key]?.[lang] ?? MESSAGES[key]?.['en'] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
    }
  }
  return msg
}
