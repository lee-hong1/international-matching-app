import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

// 이메일 수신 거부 API
export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const success = await emailService.unsubscribe(email, type)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to unsubscribe or email not found' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      message: 'Successfully unsubscribed from emails' 
    })
    
  } catch (error: any) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process unsubscribe request' },
      { status: 500 }
    )
  }
}

// 수신 거부 페이지 접근 (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const type = searchParams.get('type') || 'all'

  if (email) {
    try {
      await emailService.unsubscribe(email, type as any)
      
      // 성공 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/unsubscribed?success=true', req.url))
    } catch (error) {
      console.error('Auto unsubscribe error:', error)
      return NextResponse.redirect(new URL('/unsubscribed?success=false', req.url))
    }
  }

  return NextResponse.json(
    { error: 'Email parameter is required' },
    { status: 400 }
  )
}