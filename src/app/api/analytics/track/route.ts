import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/analytics'

// 사용자 활동 추적 API
export async function POST(req: NextRequest) {
  try {
    const { userId, activityType, targetUserId, metadata } = await req.json()

    if (!userId || !activityType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, activityType' },
        { status: 400 }
      )
    }

    await analyticsService.trackUserActivity(userId, activityType, targetUserId, metadata)
    
    return NextResponse.json({ message: 'Activity tracked successfully' })
  } catch (error: any) {
    console.error('Activity tracking error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to track activity' },
      { status: 500 }
    )
  }
}