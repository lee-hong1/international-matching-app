import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'

// ⚠️ SECURITY: 이 엔드포인트를 실제 이메일 서비스에 연결하기 전에
//    임의 HTML 허용 → 플랫폼 내 phishing 벡터. 반드시 미리정의 템플릿 방식으로 교체 필요.
//    또는 x-service-key 내부 인증으로 전환하거나 to 필드를 본인 이메일로만 제한할 것.
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

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
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

    // 스팸 릴레이 방지: 본인 이메일로만 발송 가능
    const { data: authUserData, error: authUserErr } = await supabaseService.auth.admin.getUserById(user.id)
    if (authUserErr || !authUserData?.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 403 })
    }
    if (authUserData.user.email !== to) {
      return NextResponse.json({ error: 'Can only send emails to your own address' }, { status: 403 })
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