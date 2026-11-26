// 외부 플랫폼 유도 감지 (CLAUDE.md 규칙: Zoom, KakaoTalk, Line, WeChat, WhatsApp, Telegram)
// ReDoS-safe: 각 패턴을 간단한 문자열 포함 검사로 처리

const EXTERNAL_PLATFORM_PATTERNS: readonly string[] = [
  'zoom.us',
  'zoom.com',
  'meet.google',
  'kakaotalk',
  '카카오톡',
  '카톡',           // Korean shorthand for KakaoTalk
  'open.kakao.com',
  'line.me',
  'line.naver',
  '라인으로',
  '라인에서',
  '라인 아이디',
  '라인id',
  'wechat',
  '위챗',
  'weixin',
  'whatsapp',
  '왓츠앱',
  'telegram',
  't.me/',
  '텔레그램',
  '텔레 아이디',
  '텔레id',
  '텔레에서',
  'skype',
  'discord.gg',
  'discord.com/invite',
  // Signal
  'signal.me',
  'signal.org',
  // Instagram / Facebook DM 유도
  'm.me/',
  'instagram.com/direct',
  'ig.me/',
  // Facebook Messenger
  'messenger.com',
  'fb.me/',
  // Viber
  'viber.com',
  'chats.viber',
  // 직접 결제 우회 채널 (에스크로 외부 거래 방지)
  'paypal.me',
  'paypal.com/send',
  'venmo.com',
  '@venmo',
  'cash.app',
  '$cashtag',
  'alipay.com',
  'pay.weixin',
  'toss.im',
]

/**
 * 채팅 메시지에 외부 플랫폼 유도 문자열이 포함되어 있는지 검사.
 * true 반환 시 → 경고/차단 처리 필요 (계정 정지 대상).
 */
export function detectExternalPlatform(message: string): boolean {
  const lower = message.toLowerCase()
  return EXTERNAL_PLATFORM_PATTERNS.some((pattern) => lower.includes(pattern))
}
