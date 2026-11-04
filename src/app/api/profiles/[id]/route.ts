import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUuid } from '@/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@/lib/ratelimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/profiles/:id — 공개 프로필 (email/birth_date 미포함)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // anon 스크래핑 방지 — graceful fallback (rate limit 실패해도 응답 반환)
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const rl = await checkRateLimit(ip, 'general')
    if (!rl.allowed) {
      const { body, headers, status } = rateLimitResponse(rl.resetAt)
      return NextResponse.json(body, { status, headers })
    }
  } catch {
    // rate limit 인프라 오류 시 요청 허용
  }

  const { id } = await params

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
