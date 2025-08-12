import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics'

// 플랫폼 전체 통계 API
export async function GET(req: NextRequest) {
  try {
    const stats = await analyticsService.getPlatformStatistics()
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Platform statistics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch platform statistics' },
      { status: 500 }
    )
  }
}