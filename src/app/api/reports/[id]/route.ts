import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

// 신고 처리 — 관리자 전용 (adminId는 JWT에서 추출, body에서 받지 않음)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`reports-patch:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 관리자 전용
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: reportId } = await params

  try {
    const { status, resolutionNotes } = await req.json()

    if (!status || !resolutionNotes) {
      return NextResponse.json({ error: 'status and resolutionNotes are required' }, { status: 400 })
    }

    const { error } = await supabaseService
      .from('reports')
      .update({
        status,
        resolution_notes: resolutionNotes,
        resolved_by: user.id, // JWT 기반
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (error) {
      return NextResponse.json({ error: 'Failed to process report' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[reports/[id] PATCH] error:', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
