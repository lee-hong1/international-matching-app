import { NextRequest, NextResponse } from 'next/server'
import { reportingService } from '@/lib/reporting'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'

const ALLOWED_REPORT_TYPES = [
  'harassment', 'spam', 'inappropriate_content', 'fake_profile',
  'external_platform', 'underage', 'scam', 'violence', 'other',
]
const ALLOWED_STATUS = ['pending', 'reviewed', 'resolved', 'dismissed']
const ALLOWED_PRIORITY = ['low', 'medium', 'high', 'critical']

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim()).filter(Boolean)
  const { data } = await supabaseService
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()
  return data?.email ? adminEmails.includes(data.email) : false
}

// 신고 생성 — reporter_id는 JWT에서 추출 (IDOR 방지)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`reports:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const reportData = await req.json()

    if (!reportData.reported_user_id || !reportData.report_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!isValidUuid(reportData.reported_user_id)) {
      return NextResponse.json({ error: 'Invalid reported_user_id' }, { status: 400 })
    }
    if (reportData.reported_content_id && !isValidUuid(reportData.reported_content_id)) {
      return NextResponse.json({ error: 'Invalid reported_content_id' }, { status: 400 })
    }
    if (!ALLOWED_REPORT_TYPES.includes(reportData.report_type)) {
      return NextResponse.json({ error: 'Invalid report_type' }, { status: 400 })
    }

    // reporter_id는 클라이언트 입력이 아닌 JWT 검증된 uid 사용
    const safeReportData = { ...reportData, reporter_id: user.id }

    if (safeReportData.reported_user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      )
    }

    // 중복 신고 확인
    const { data: existingReport } = await supabaseService
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_user_id', safeReportData.reported_user_id)
      .eq('reported_content_id', safeReportData.reported_content_id || null)
      .single()

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this user/content' },
        { status: 409 }
      )
    }

    const report = await reportingService.createReport(safeReportData)

    if (!report) {
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('[reports POST]', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 신고 목록 조회 (관리자 전용 — 인증 필수)
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`reports-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const admin = await isAdmin(user.id)
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const rawStatus = searchParams.get('status')
    const rawPriority = searchParams.get('priority')
    const rawReportType = searchParams.get('report_type')

    const query = {
      status: rawStatus && ALLOWED_STATUS.includes(rawStatus) ? rawStatus as any : undefined,
      priority: rawPriority && ALLOWED_PRIORITY.includes(rawPriority) ? rawPriority as any : undefined,
      report_type: rawReportType && ALLOWED_REPORT_TYPES.includes(rawReportType) ? rawReportType as any : undefined,
      page: Math.max(parseInt(searchParams.get('page') || '1'), 1),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
    }

    const { reports, total } = await reportingService.searchReports(query)

    return NextResponse.json({
      reports,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    })
  } catch (error) {
    console.error('[reports GET]', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}