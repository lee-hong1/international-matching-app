// 외부 플랫폼 유도 감지 (CLAUDE.md 규칙: Zoom, KakaoTalk, Line, WeChat, WhatsApp, Telegram)
// ReDoS-safe: 각 패턴을 간단한 문자열 포함 검사로 처리

const EXTERNAL_PLATFORM_PATTERNS: readonly string[] = [
  'zoom.us',
  'zoom.com',
  'meet.google',
  'kakaotalk',
  '카카오톡',
  'kakao.com',
  'line.me',
  'line.naver',
  '라인으로',
  'wechat',
  '위챗',
  'weixin',
  'whatsapp',
  '왓츠앱',
  'telegram',
  't.me/',
  '텔레그램',
  'skype',
  'discord.gg',
  'discord.com/invite',
]

/**
 * 채팅 메시지에 외부 플랫폼 유도 문자열이 포함되어 있는지 검사.
 * true 반환 시 → 경고/차단 처리 필요 (계정 정지 대상).
 */
export function detectExternalPlatform(message: string): boolean {
  const lower = message.toLowerCase()
  return EXTERNAL_PLATFORM_PATTERNS.some((pattern) => lower.includes(pattern))
}
