const LOCALE_MAP: Record<string, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
}

export function formatBookingTime(iso: string, tz: string, locale: string): string {
  const resolvedLocale = LOCALE_MAP[locale] ?? locale
  return new Intl.DateTimeFormat(resolvedLocale, {
    timeZone: tz,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: resolvedLocale === 'ko-KR' || resolvedLocale === 'zh-CN' || resolvedLocale === 'ja-JP',
  }).format(new Date(iso))
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function formatRelativeTime(iso: string, locale: string): string {
  const resolvedLocale = LOCALE_MAP[locale] ?? locale
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' })
  if (days > 0) return rtf.format(-days, 'day')
  if (hours > 0) return rtf.format(-hours, 'hour')
  return rtf.format(-minutes, 'minute')
}
