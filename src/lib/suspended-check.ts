import { supabaseService } from '@src/lib/commerce'

/**
 * 정지 체크 2레이어 아키텍처:
 *
 * 1. 미들웨어 (src/middleware.ts): JWT app_metadata.is_suspended 확인 (빠름, DB 조회 없음)
 *    - 적용 대상: 페이지 라우트 (/feed, /discover, /bookings 등)
 *    - 단점: JWT 만료까지 최대 1시간 지연 가능 (admin API가 app_metadata 갱신)
 *
 * 2. API route (이 함수): DB 직접 조회 (실시간, 최종 방어선)
 *    - 적용 대상: 쓰기 API (POST chat, reviews, services, bookings, shop-links 등)
 *    - fail-closed: DB 오류 시 true 반환 → 접근 차단 (보수적)
 */
export async function isSuspended(userId: string): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('profiles')
    .select('is_suspended')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[isSuspended] DB error, failing closed for user', userId.substring(0, 8) + '...')
    return true
  }
  return data?.is_suspended === true
}
