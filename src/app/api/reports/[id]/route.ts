import { NextRequest, NextResponse } from 'next/server'
import { reportingService } from '@/lib/reporting'

// 신고 처리
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, resolutionNotes, adminId } = await req.json()
    
    if (!status || !resolutionNotes || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const success = await reportingService.processReport(
      params.id,
      status,
      resolutionNotes,
      adminId
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to process report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Report processed successfully' })
  } catch (error: any) {
    console.error('Report processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}