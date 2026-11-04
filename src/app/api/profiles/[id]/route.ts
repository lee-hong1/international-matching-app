import { NextRequest, NextResponse } from 'next/server'
import { isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { supabase } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(token)
  return user
}

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

// DELETE /api/profiles/:id — GDPR Right-to-Erasure (본인만)
// Supabase Auth 계정 삭제 → cascade로 모든 프로필/콘텐츠 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = await params

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 })
  }

  // 본인 계정만 삭제 가능 (IDOR 방지)
  if (user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Supabase auth.admin.deleteUser는 연결된 profiles row를 cascade 삭제
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) {
    console.error('[profiles DELETE] auth.admin.deleteUser failed:', id.substring(0, 8) + '...')
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Account and all associated data deleted' }, { status: 200 })
}
