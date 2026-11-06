import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser } from '@src/lib/commerce'

// 이메일 전송 API (실제 구현에서는 SendGrid, AWS SES, Mailgun 등 사용)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`email-send:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // JWT 인증 필수 — 미인증 시 스팸 릴레이로 악용 가능
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { to, subject, html, text, recipientName } = await req.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and content' },
        { status: 400 }
      )
    }

    // 기본 이메일 형식 검증 (스팸 릴레이 방지)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof to !== 'string' || !emailRegex.test(to) || to.length > 254) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // 스팸 릴레이 방지: to 주소가 플랫폼 등록 사용자여야 함
    const { count: recipientCount } = await (await import('@src/lib/commerce')).supabaseService
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('email', to)
    if (!recipientCount || recipientCount === 0) {
      return NextResponse.json({ error: 'Recipient not found on platform' }, { status: 403 })
    }
    // 콘텐츠 길이 제한 (DoS / 대용량 이메일 방지)
    if (typeof subject !== 'string' || subject.length > 200) {
      return NextResponse.json({ error: 'subject must be under 200 characters' }, { status: 400 })
    }
    const contentLen = (html?.length ?? 0) + (text?.length ?? 0)
    if (contentLen > 50_000) {
      return NextResponse.json({ error: 'Email content too large (max 50,000 chars)' }, { status: 400 })
    }

    // 실제 구현에서는 여기서 외부 이메일 서비스 API를 호출
    // 예: SendGrid, AWS SES, Mailgun, Nodemailer 등
    
    // SendGrid 예시:
    /*
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    const msg = {
      to,
      from: process.env.FROM_EMAIL,
      subject,
      text,
      html,
    }
    
    await sgMail.send(msg)
    */

    // AWS SES 예시:
    /*
    const AWS = require('aws-sdk')
    const ses = new AWS.SES({ region: 'us-east-1' })
    
    const params = {
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Body: {
          Html: {
            Data: html
          },
          Text: {
            Data: text
          }
        },
        Subject: {
          Data: subject
        }
      },
      Source: process.env.FROM_EMAIL
    }
    
    await ses.sendEmail(params).promise()
    */

    // 현재는 로그로만 출력 (실제 전송은 하지 않음)
    // PII 규칙: 이메일 주소 로그 금지 — to 필드 제외
    console.log('Email would be sent:', {
      subject,
      contentLength: html?.length || text?.length
    })

    // 실제 이메일 서비스 연동 시에는 위의 주석 해제하고 사용
    // 개발 환경에서는 성공으로 처리
    return NextResponse.json({ 
      message: 'Email sent successfully',
      messageId: `mock_${Date.now()}`
    })
    
  } catch (error) {
    console.error('Email sending error:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}