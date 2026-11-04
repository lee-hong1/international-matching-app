import { supabaseService } from '@/lib/commerce'

/**
 * 사용자 정지 여부 확인. service_role로 조회하여 RLS 우회 없이 신뢰할 수 있는 값 반환.
 * 미들웨어 커버리지 밖의 API 라우트(reviews POST, profiles PATCH 등)에서 사용.
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
