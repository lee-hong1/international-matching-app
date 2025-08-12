import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reportingService } from '@/lib/reporting'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 신고 생성
export async function POST(req: NextRequest) {
  try {
    const reportData = await req.json()

    // 필수 필드 검증
    if (!reportData.reporter_id || !reportData.reported_user_id || !reportData.report_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 자신을 신고하는 것 방지
    if (reportData.reporter_id === reportData.reported_user_id) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      )
    }

    // 중복 신고 확인
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', reportData.reporter_id)
      .eq('reported_user_id', reportData.reported_user_id)
      .eq('reported_content_id', reportData.reported_content_id || null)
      .single()

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this user/content' },
        { status: 409 }
      )
    }

    const report = await reportingService.createReport(reportData)
    
    if (!report) {
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Report creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// 신고 목록 조회 (관리자용)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = {
      status: searchParams.get('status') as any,
      priority: searchParams.get('priority') as any,
      report_type: searchParams.get('report_type') as any,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const { reports, total } = await reportingService.searchReports(query)

    return NextResponse.json({
      reports,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit)
    })
  } catch (error: any) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}