import { NextRequest, NextResponse } from 'next/server'
import { reportingService } from '@/lib/reporting'

// 사용자 차단 해제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const blockerId = searchParams.get('blockerId')
    
    if (!blockerId) {
      return NextResponse.json(
        { error: 'Blocker ID is required' },
        { status: 400 }
      )
    }

    const success = await reportingService.unblockUser(blockerId, params.id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to unblock user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'User unblocked successfully' })
  } catch (error: any) {
    console.error('Unblock user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}