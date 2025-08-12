import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics'

// 국가별 통계 API
export async function GET(req: NextRequest) {
  try {
    const stats = await analyticsService.getCountryStatistics()
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('Country statistics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch country statistics' },
      { status: 500 }
    )
  }
}