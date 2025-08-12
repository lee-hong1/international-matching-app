import { NextRequest, NextResponse } from 'next/server'
import { reportingService } from '@/lib/reporting'

// 사용자 차단
export async function POST(req: NextRequest) {
  try {
    const { blockerId, blockedUserId, reason } = await req.json()

    if (!blockerId || !blockedUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (blockerId === blockedUserId) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      )
    }

    const success = await reportingService.blockUser(blockerId, blockedUserId, reason || '차단됨')
    
    if (!success) {
      return NextResponse.json(
        { error: 'User is already blocked or operation failed' },
        { status: 409 }
      )
    }

    return NextResponse.json({ message: 'User blocked successfully' })
  } catch (error: any) {
    console.error('Block user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// 차단된 사용자 목록
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const { blocks, total } = await reportingService.getBlockedUsers(userId, page, limit)

    return NextResponse.json({
      blocks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error: any) {
    console.error('Error fetching blocked users:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}