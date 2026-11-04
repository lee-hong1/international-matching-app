import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 사용자 차단 해제 — blockerId는 JWT에서 추출 (IDOR 방지)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`blocks-delete:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id: blockedUserId } = await params

  try {
    const { error } = await supabaseService
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id) // JWT 기반 — 본인 차단 목록만 삭제 가능
      .eq('blocked_id', blockedUserId)

    if (error) {
      return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[blocks/[id] DELETE] error:', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
