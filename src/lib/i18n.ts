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
  'signup.next_step': { ko: '다음 단계', en: 'Next Step', ja: '次のステップ', zh: '下一步' },
  'signup.next': { ko: '다음', en: 'Next', ja: '次へ', zh: '下一步' },
  'signup.previous': { ko: '이전', en: 'Back', ja: '戻る', zh: '上一步' },

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

  // ── 호스트 가용 시간 ───────────────────────────────────────────────────
  'availability.title': { ko: '가용 시간 설정', en: 'Set Availability', ja: '予約可能時間設定', zh: '设置可用时间' },
  'availability.day_of_week': { ko: '요일', en: 'Day of Week', ja: '曜日', zh: '星期' },
  'availability.start_time': { ko: '시작 시간', en: 'Start Time', ja: '開始時間', zh: '开始时间' },
  'availability.end_time': { ko: '종료 시간', en: 'End Time', ja: '終了時間', zh: '结束时间' },
  'availability.timezone': { ko: '시간대', en: 'Timezone', ja: 'タイムゾーン', zh: '时区' },
  'availability.add_slot': { ko: '슬롯 추가', en: 'Add Slot', ja: 'スロット追加', zh: '添加时段' },
  'availability.delete': { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' },
  'availability.no_slots': { ko: '등록된 가용 시간이 없습니다', en: 'No availability slots set', ja: '予約可能時間が設定されていません', zh: '未设置可用时段' },
  'availability.save_success': { ko: '저장되었습니다', en: 'Saved', ja: '保存しました', zh: '已保存' },
  'availability.save_error': { ko: '저장 실패', en: 'Save failed', ja: '保存失敗', zh: '保存失败' },
  'availability.days.0': { ko: '일요일', en: 'Sunday', ja: '日曜日', zh: '周日' },
  'availability.days.1': { ko: '월요일', en: 'Monday', ja: '月曜日', zh: '周一' },
  'availability.days.2': { ko: '화요일', en: 'Tuesday', ja: '火曜日', zh: '周二' },
  'availability.days.3': { ko: '수요일', en: 'Wednesday', ja: '水曜日', zh: '周三' },
  'availability.days.4': { ko: '목요일', en: 'Thursday', ja: '木曜日', zh: '周四' },
  'availability.days.5': { ko: '금요일', en: 'Friday', ja: '金曜日', zh: '周五' },
  'availability.days.6': { ko: '토요일', en: 'Saturday', ja: '土曜日', zh: '周六' },

  // ── 리뷰 ──────────────────────────────────────────────────────────────
  'review.title': { ko: '리뷰', en: 'Reviews', ja: 'レビュー', zh: '评价' },
  'review.write': { ko: '리뷰 작성', en: 'Write a Review', ja: 'レビューを書く', zh: '写评价' },
  'review.rating': { ko: '별점', en: 'Rating', ja: '評価', zh: '评分' },
  'review.comment': { ko: '후기', en: 'Comment', ja: 'コメント', zh: '评论' },
  'review.submit': { ko: '제출', en: 'Submit', ja: '送信', zh: '提交' },
  'review.private': { ko: '비공개 리뷰', en: 'Private Review', ja: '非公開レビュー', zh: '私密评价' },
  'review.empty': { ko: '아직 리뷰가 없습니다', en: 'No reviews yet', ja: 'まだレビューがありません', zh: '暂无评价' },
  'review.success': { ko: '리뷰가 등록되었습니다', en: 'Review submitted', ja: 'レビューを投稿しました', zh: '评价已提交' },
  'review.error': { ko: '리뷰 등록 실패', en: 'Failed to submit review', ja: 'レビュー投稿失敗', zh: '提交评价失败' },

  // ── 호스트 대시보드 / 서비스 관리 ──────────────────────────────────────
  'host.dashboard_title': { ko: '호스트 대시보드', en: 'Host Dashboard', ja: 'ホストダッシュボード', zh: '主机仪表板' },
  'host.services_title': { ko: '내 서비스', en: 'My Services', ja: 'サービス管理', zh: '服务管理' },
  'host.services_add': { ko: '서비스 추가', en: 'Add Service', ja: 'サービス追加', zh: '添加服务' },
  'host.services_edit': { ko: '수정', en: 'Edit', ja: '編集', zh: '编辑' },
  'host.services_save': { ko: '저장', en: 'Save', ja: '保存', zh: '保存' },
  'host.services_deactivate': { ko: '비활성화', en: 'Deactivate', ja: '無効化', zh: '停用' },
  'host.services_deactivate_confirm': { ko: '정말 비활성화하시겠습니까?', en: 'Deactivate this service?', ja: 'サービスを無効化しますか？', zh: '确定要停用此服务吗？' },
  'host.services_inactive': { ko: '비활성', en: 'Inactive', ja: '無効', zh: '已停用' },
  'host.services_empty': { ko: '등록된 서비스가 없습니다', en: 'No services yet', ja: 'サービスがありません', zh: '暂无服务' },
  'host.services_field_title': { ko: '서비스 이름', en: 'Title', ja: 'タイトル', zh: '标题' },
  'host.services_field_desc': { ko: '설명', en: 'Description', ja: '説明', zh: '描述' },
  'host.services_field_duration': { ko: '소요 시간(분)', en: 'Duration (min)', ja: '所要時間(分)', zh: '时长（分钟）' },
  'host.services_field_price': { ko: '가격', en: 'Price', ja: '価格', zh: '价格' },
  'host.services_field_currency': { ko: '통화', en: 'Currency', ja: '通貨', zh: '货币' },
  'host.services_field_category': { ko: '카테고리', en: 'Category', ja: 'カテゴリ', zh: '类别' },
  'host.bookings_title': { ko: '예약 관리', en: 'Manage Bookings', ja: '予約管理', zh: '预订管理' },
  'host.bookings_desc': { ko: '들어온 예약 확인 및 처리', en: 'View and handle incoming bookings', ja: '予約の確認・対応', zh: '查看和处理预订' },
  'host.services_desc': { ko: '서비스 등록 및 수정', en: 'Register and edit services', ja: 'サービスの登録・編集', zh: '注册和编辑服务' },

  // ── 예약 플로우 ────────────────────────────────────────────────────────
  'book.loading': { ko: '불러오는 중…', en: 'Loading…', ja: '読み込み中…', zh: '加载中…' },
  'book.select_datetime': { ko: '날짜 및 시간 선택', en: 'Select Date & Time', ja: '日時を選択', zh: '选择日期和时间' },
  'book.available_days': { ko: '가용 요일', en: 'Available days', ja: '対応曜日', zh: '可用日期' },
  'book.date': { ko: '날짜', en: 'Date', ja: '日付', zh: '日期' },
  'book.time': { ko: '시간', en: 'Time', ja: '時間', zh: '时间' },
  'book.notes': { ko: '메모 (선택)', en: 'Notes (optional)', ja: 'メモ（任意）', zh: '备注（可选）' },
  'book.notes_placeholder': { ko: '호스트에게 전달할 메시지를 입력하세요', en: 'Message for the host', ja: 'ホストへのメッセージ', zh: '给主人的留言' },
  'book.confirm': { ko: '예약 확정', en: 'Confirm Booking', ja: '予約を確定する', zh: '确认预约' },
  'book.submitting': { ko: '처리 중…', en: 'Submitting…', ja: '処理中…', zh: '提交中…' },
  'book.slot_taken': { ko: '이미 예약된 시간입니다. 다른 시간을 선택해 주세요.', en: 'This time slot is already taken. Please choose another.', ja: 'この時間は既に予約されています。別の時間を選んでください。', zh: '该时间段已被预约，请选择其他时间。' },
  'book.success_title': { ko: '예약 완료!', en: 'Booking Confirmed!', ja: '予約完了！', zh: '预约成功！' },
  'book.success_body': { ko: '예약이 접수되었습니다. 호스트 확인 후 알림을 받으실 수 있습니다.', en: 'Your booking has been submitted. You will be notified once the host confirms.', ja: '予約が送信されました。ホストの確認後に通知が届きます。', zh: '您的预约已提交，主人确认后您将收到通知。' },
  'book.back_to_profile': { ko: '프로필로 돌아가기', en: 'Back to Profile', ja: 'プロフィールに戻る', zh: '返回档案' },
  'book.cancel': { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' },
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
