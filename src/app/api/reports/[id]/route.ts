import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

const VALID_REPORT_STATUSES = new Set(['pending', 'reviewing', 'resolved', 'dismissed'])

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
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: reportId } = await params
  if (!reportId || !isValidUuid(reportId)) {
    return NextResponse.json({ error: 'Invalid report id' }, { status: 400 })
  }

  try {
    const { status, resolutionNotes } = await req.json()

    if (!status || !resolutionNotes) {
      return NextResponse.json({ error: 'status and resolutionNotes are required' }, { status: 400 })
    }
    if (!VALID_REPORT_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${[...VALID_REPORT_STATUSES].join(', ')}` },
        { status: 400 }
      )
    }
    if (typeof resolutionNotes !== 'string' || resolutionNotes.length > 5000) {
      return NextResponse.json({ error: 'resolutionNotes must be a string under 5000 characters' }, { status: 400 })
    }

    const { data: updated, error } = await supabaseService
      .from('reports')
      .update({
        status,
        resolution_notes: resolutionNotes,
        resolved_by: user.id, // JWT 기반
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select('id')
      .single()

    if (error?.code === 'PGRST116' || !updated) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    if (error) {
      return NextResponse.json({ error: 'Failed to process report' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[reports/[id] PATCH] error:', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
