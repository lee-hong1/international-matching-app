import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics'

// 사용자별 상세 분석 API
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')

    const analytics = await analyticsService.getUserAnalytics(params.userId, days)
    
    return NextResponse.json(analytics)
  } catch (error: any) {
    console.error('User analytics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user analytics' },
      { status: 500 }
    )
  }
}