export type Locale = 'ko' | 'en' | 'zh' | 'ja'

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
}

export const LOCALE_FLAG: Record<Locale, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
  zh: '🇨🇳',
  ja: '🇯🇵',
}

type TranslationKeys = {
  loading: string; error: string; back: string; save: string; cancel: string
  confirm: string; close: string; next: string; free: string
  nav_home: string; nav_explore: string; nav_events: string; nav_match: string; nav_profile: string
  events_title: string; events_all: string; events_drink: string; events_meal: string; events_party: string
  events_create: string; events_empty: string; events_empty_sub: string; events_full: string
  events_closed: string; events_free: string; events_persons: string; events_partner_venue: string; events_featured: string
  create_title: string; create_type: string; create_name: string; create_name_placeholder: string
  create_desc: string; create_desc_placeholder: string; create_venue: string; create_venue_partner: string
  create_venue_custom: string; create_venue_custom_placeholder: string; create_datetime: string
  create_max_persons: string; create_fee: string; create_fee_desc: string; create_submit: string
  create_submitting: string; create_premium_only: string; create_premium_desc: string; create_premium_btn: string
  create_no_venues: string
  detail_host: string; detail_apply: string; detail_applying: string; detail_pay_apply: string
  detail_my_status: string; detail_pending: string; detail_approved: string; detail_rejected: string
  detail_cancelled: string; detail_participants: string; detail_no_participants: string
  detail_approve: string; detail_reject: string; detail_back_list: string; detail_partner_discount: string
  share_title: string; share_copy: string; share_copied: string; share_text_label: string
  share_kakao: string; share_line: string; share_twitter: string; share_facebook: string
  share_wechat: string; share_wechat_copy: string; share_instagram: string; share_generating: string
  share_boost: string; share_boost_desc: string; share_boost_btn: string; share_featured_badge: string
  payment_success: string; payment_success_desc: string; payment_fail: string; payment_fail_desc: string
  payment_back: string; payment_confirming: string
}

const ko: TranslationKeys = {
  loading: '로딩 중...', error: '오류가 발생했습니다', back: '뒤로', save: '저장', cancel: '취소',
  confirm: '확인', close: '닫기', next: '다음', free: '무료',
  nav_home: '홈', nav_explore: '탐색', nav_events: '모임', nav_match: '매칭', nav_profile: '프로필',
  events_title: '오프라인 모임', events_all: '전체', events_drink: '술 친구', events_meal: '밥 친구',
  events_party: '파티원 모집', events_create: '모임 만들기', events_empty: '아직 모집 중인 모임이 없습니다',
  events_empty_sub: '새로운 모임을 만들어보세요!', events_full: '마감', events_closed: '종료',
  events_free: '무료', events_persons: '명', events_partner_venue: '제휴 매장', events_featured: '추천',
  create_title: '모임 만들기', create_type: '모임 유형', create_name: '제목',
  create_name_placeholder: '예) 강남에서 가볍게 한잔 하실 분!', create_desc: '설명 (선택)',
  create_desc_placeholder: '모임에 대한 설명을 적어주세요', create_venue: '모임 장소',
  create_venue_partner: '제휴 매장', create_venue_custom: '직접 입력',
  create_venue_custom_placeholder: '예) 강남역 11번 출구 OO카페', create_datetime: '모임 일시',
  create_max_persons: '모집 인원', create_fee: '참가비 (원, 무료는 0)',
  create_fee_desc: '참가비에서 플랫폼 수수료가 차감된 금액이 호스트에게 정산됩니다.',
  create_submit: '모임 만들기', create_submitting: '생성 중...',
  create_premium_only: '유료 회원만 이용 가능합니다',
  create_premium_desc: '모임 만들기는 프리미엄 멤버십 가입 후 이용할 수 있어요.',
  create_premium_btn: '프리미엄 알아보기', create_no_venues: '이용 가능한 제휴 매장이 없습니다',
  detail_host: '호스트', detail_apply: '참가 신청하기', detail_applying: '처리 중...',
  detail_pay_apply: '원 결제하고 참가 신청', detail_my_status: '신청 상태',
  detail_pending: '승인 대기', detail_approved: '승인됨', detail_rejected: '거절됨', detail_cancelled: '취소됨',
  detail_participants: '참가 신청', detail_no_participants: '아직 신청자가 없습니다',
  detail_approve: '승인', detail_reject: '거절', detail_back_list: '목록으로 돌아가기',
  detail_partner_discount: '제휴 매장 할인 적용가',
  share_title: 'SNS 홍보', share_copy: '텍스트 복사', share_copied: '복사됨!', share_text_label: '홍보 문구',
  share_kakao: '카카오톡', share_line: 'LINE', share_twitter: 'X(트위터)', share_facebook: '페이스북',
  share_wechat: '위챗 공유', share_wechat_copy: '링크 복사 (위챗)', share_instagram: '인스타그램 복사',
  share_generating: '홍보 문구 생성 중...', share_boost: '상단 노출 부스트',
  share_boost_desc: '내 모임을 목록 최상단에 노출시킵니다 (24시간)', share_boost_btn: '부스트 신청',
  share_featured_badge: '추천',
  payment_success: '결제가 완료되었습니다', payment_success_desc: '참가 신청이 승인되었습니다.',
  payment_fail: '결제가 취소되었습니다', payment_fail_desc: '결제가 진행되지 않았습니다.',
  payment_back: '모임으로 돌아가기', payment_confirming: '결제를 확인하고 있습니다...',
}

const en: TranslationKeys = {
  loading: 'Loading...', error: 'An error occurred', back: 'Back', save: 'Save', cancel: 'Cancel',
  confirm: 'Confirm', close: 'Close', next: 'Next', free: 'Free',
  nav_home: 'Home', nav_explore: 'Explore', nav_events: 'Events', nav_match: 'Match', nav_profile: 'Profile',
  events_title: 'Offline Events', events_all: 'All', events_drink: 'Drinks', events_meal: 'Meals',
  events_party: 'Party', events_create: 'Create Event', events_empty: 'No events available yet',
  events_empty_sub: 'Be the first to create one!', events_full: 'Full', events_closed: 'Closed',
  events_free: 'Free', events_persons: 'persons', events_partner_venue: 'Partner Venue', events_featured: 'Featured',
  create_title: 'Create Event', create_type: 'Event Type', create_name: 'Title',
  create_name_placeholder: 'e.g. Looking for someone to grab drinks in Gangnam!',
  create_desc: 'Description (optional)', create_desc_placeholder: 'Tell people about this event',
  create_venue: 'Venue', create_venue_partner: 'Partner Venue', create_venue_custom: 'Custom Location',
  create_venue_custom_placeholder: 'e.g. OO Cafe near Gangnam Station exit 11',
  create_datetime: 'Date & Time', create_max_persons: 'Max Participants',
  create_fee: 'Fee per person (KRW, 0 for free)',
  create_fee_desc: 'Platform fee is deducted from the participation fee.',
  create_submit: 'Create Event', create_submitting: 'Creating...',
  create_premium_only: 'Premium members only',
  create_premium_desc: 'Please upgrade to Premium to create events.',
  create_premium_btn: 'Learn about Premium', create_no_venues: 'No partner venues available',
  detail_host: 'Host', detail_apply: 'Apply to Join', detail_applying: 'Processing...',
  detail_pay_apply: 'Pay & Apply', detail_my_status: 'Application Status',
  detail_pending: 'Pending', detail_approved: 'Approved', detail_rejected: 'Rejected', detail_cancelled: 'Cancelled',
  detail_participants: 'Applicants', detail_no_participants: 'No applicants yet',
  detail_approve: 'Approve', detail_reject: 'Reject', detail_back_list: 'Back to list',
  detail_partner_discount: 'Partner discount price',
  share_title: 'Share & Promote', share_copy: 'Copy Text', share_copied: 'Copied!', share_text_label: 'Promo Text',
  share_kakao: 'KakaoTalk', share_line: 'LINE', share_twitter: 'X (Twitter)', share_facebook: 'Facebook',
  share_wechat: 'WeChat Share', share_wechat_copy: 'Copy Link (WeChat)', share_instagram: 'Copy for Instagram',
  share_generating: 'Generating promo text...', share_boost: 'Featured Boost',
  share_boost_desc: 'Pin your event to the top of the list (24 hours)', share_boost_btn: 'Get Boost',
  share_featured_badge: 'Featured',
  payment_success: 'Payment Completed', payment_success_desc: 'Your application has been approved.',
  payment_fail: 'Payment Cancelled', payment_fail_desc: 'Payment was not completed.',
  payment_back: 'Back to Event', payment_confirming: 'Confirming payment...',
}

const zh: TranslationKeys = {
  loading: '加载中...', error: '发生错误', back: '返回', save: '保存', cancel: '取消',
  confirm: '确认', close: '关闭', next: '下一步', free: '免费',
  nav_home: '首页', nav_explore: '探索', nav_events: '活动', nav_match: '匹配', nav_profile: '个人',
  events_title: '线下活动', events_all: '全部', events_drink: '喝酒伙伴', events_meal: '吃饭伙伴',
  events_party: '派对招募', events_create: '创建活动', events_empty: '暂无招募中的活动',
  events_empty_sub: '快来创建新活动吧！', events_full: '已满', events_closed: '已结束',
  events_free: '免费', events_persons: '人', events_partner_venue: '合作场所', events_featured: '推荐',
  create_title: '创建活动', create_type: '活动类型', create_name: '标题',
  create_name_placeholder: '例: 在江南区想找人一起喝酒的来！',
  create_desc: '描述（选填）', create_desc_placeholder: '请填写活动描述',
  create_venue: '活动地点', create_venue_partner: '合作场所', create_venue_custom: '自定义地点',
  create_venue_custom_placeholder: '例: 江南站11号出口OO咖啡馆',
  create_datetime: '活动时间', create_max_persons: '招募人数',
  create_fee: '参加费（韩元，0为免费）',
  create_fee_desc: '参加费扣除平台手续费后结算给主办方。',
  create_submit: '创建活动', create_submitting: '创建中...',
  create_premium_only: '仅限付费会员',
  create_premium_desc: '请升级至高级会员后创建活动。',
  create_premium_btn: '了解高级会员', create_no_venues: '暂无可用合作场所',
  detail_host: '主办人', detail_apply: '申请参加', detail_applying: '处理中...',
  detail_pay_apply: '韩元 付款并申请', detail_my_status: '申请状态',
  detail_pending: '待审核', detail_approved: '已通过', detail_rejected: '已拒绝', detail_cancelled: '已取消',
  detail_participants: '参加申请', detail_no_participants: '暂无申请者',
  detail_approve: '通过', detail_reject: '拒绝', detail_back_list: '返回列表',
  detail_partner_discount: '合作优惠价',
  share_title: 'SNS 推广', share_copy: '复制文字', share_copied: '已复制！', share_text_label: '推广文案',
  share_kakao: 'KakaoTalk', share_line: 'LINE', share_twitter: 'X（推特）', share_facebook: 'Facebook',
  share_wechat: '微信分享', share_wechat_copy: '复制链接（微信）', share_instagram: '复制到Instagram',
  share_generating: '推广文案生成中...', share_boost: '置顶推广',
  share_boost_desc: '将您的活动置顶显示（24小时）', share_boost_btn: '申请置顶',
  share_featured_badge: '推荐',
  payment_success: '付款成功', payment_success_desc: '您的申请已获批准。',
  payment_fail: '付款已取消', payment_fail_desc: '付款未完成。',
  payment_back: '返回活动', payment_confirming: '确认付款中...',
}

const ja: TranslationKeys = {
  loading: '読み込み中...', error: 'エラーが発生しました', back: '戻る', save: '保存', cancel: 'キャンセル',
  confirm: '確認', close: '閉じる', next: '次へ', free: '無料',
  nav_home: 'ホーム', nav_explore: '探索', nav_events: 'イベント', nav_match: 'マッチング', nav_profile: 'プロフィール',
  events_title: 'オフラインイベント', events_all: 'すべて', events_drink: '飲み友達', events_meal: 'ご飯友達',
  events_party: 'パーティー募集', events_create: 'イベント作成', events_empty: '現在募集中のイベントはありません',
  events_empty_sub: '新しいイベントを作成しましょう！', events_full: '満員', events_closed: '終了',
  events_free: '無料', events_persons: '名', events_partner_venue: '提携店舗', events_featured: 'おすすめ',
  create_title: 'イベント作成', create_type: 'イベント種類', create_name: 'タイトル',
  create_name_placeholder: '例）江南で気軽に一杯やりませんか！',
  create_desc: '説明（任意）', create_desc_placeholder: 'イベントの説明を書いてください',
  create_venue: '会場', create_venue_partner: '提携店舗', create_venue_custom: '自由入力',
  create_venue_custom_placeholder: '例）江南駅11番出口〇〇カフェ',
  create_datetime: '開催日時', create_max_persons: '募集人数',
  create_fee: '参加費（ウォン、無料は0）',
  create_fee_desc: '参加費からプラットフォーム手数料を差し引いた金額がホストに支払われます。',
  create_submit: 'イベントを作成', create_submitting: '作成中...',
  create_premium_only: '有料会員のみ利用可能',
  create_premium_desc: 'イベント作成はプレミアム会員登録後にご利用いただけます。',
  create_premium_btn: 'プレミアムを見る', create_no_venues: '利用可能な提携店舗がありません',
  detail_host: 'ホスト', detail_apply: '参加申し込み', detail_applying: '処理中...',
  detail_pay_apply: 'ウォン 支払って申し込む', detail_my_status: '申し込み状況',
  detail_pending: '審査待ち', detail_approved: '承認済み', detail_rejected: '却下', detail_cancelled: 'キャンセル',
  detail_participants: '参加申し込み', detail_no_participants: 'まだ申し込みがありません',
  detail_approve: '承認', detail_reject: '却下', detail_back_list: 'リストに戻る',
  detail_partner_discount: '提携割引価格',
  share_title: 'SNSでシェア・宣伝', share_copy: 'テキストをコピー', share_copied: 'コピーしました！',
  share_text_label: '宣伝文', share_kakao: 'KakaoTalk', share_line: 'LINE',
  share_twitter: 'X（ツイッター）', share_facebook: 'Facebook',
  share_wechat: 'WeChat シェア', share_wechat_copy: 'リンクをコピー（WeChat）',
  share_instagram: 'Instagramにコピー', share_generating: '宣伝文を生成中...',
  share_boost: '上位表示ブースト', share_boost_desc: 'イベントをリスト最上位に表示します（24時間）',
  share_boost_btn: 'ブーストを申し込む', share_featured_badge: 'おすすめ',
  payment_success: '決済が完了しました', payment_success_desc: '参加申し込みが承認されました。',
  payment_fail: '決済がキャンセルされました', payment_fail_desc: '決済は完了しませんでした。',
  payment_back: 'イベントに戻る', payment_confirming: '決済を確認しています...',
}

export const translations: Record<Locale, TranslationKeys> = { ko, en, zh, ja }

export function t(locale: Locale, key: keyof TranslationKeys): string {
  return translations[locale][key] ?? translations['ko'][key] ?? key
}
