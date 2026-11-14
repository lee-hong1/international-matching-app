export const CURRENCY_SYMBOL: Record<string, string> = {
  KRW: '₩',
  JPY: '¥',
  CNY: '¥',
  USD: '$',
  EUR: '€',
}

export function formatCurrency(amount: number, currency: string, locale?: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  const formatted = amount.toLocaleString(locale ?? 'en-US')
  return `${symbol}${formatted}`
}
