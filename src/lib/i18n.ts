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

/**
 * 번역 조회.
 * 키가 없으면 key를 그대로 반환 (graceful fallback).
 */
export function t(key: string, lang: Lang): string {
  return MESSAGES[key]?.[lang] ?? MESSAGES[key]?.['en'] ?? key
}
