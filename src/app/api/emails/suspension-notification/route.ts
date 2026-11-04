import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isValidUuid } from '@src/lib/commerce'

/**
 * POST /api/emails/suspension-notification
 * 내부 호출 전용. 계정 정지 시 이메일 고지 (한국 전자상거래법 소비자 보호 의무).
 * 이메일 주소는 로그에 출력하지 않는다.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-service-key')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || authHeader !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId } = body
  if (!userId || !isValidUuid(userId)) {
    return NextResponse.json({ error: 'Valid userId required' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not configured' })
  }

  // service_role로 이메일 조회 (public_profiles view에는 email 미포함)
  const { data: profile, error } = await supabaseService
    .from('profiles')
    .select('preferred_lang')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // auth.users에서 이메일 조회
  const { data: authUser, error: authErr } = await supabaseService.auth.admin.getUserById(userId)
  if (authErr || !authUser?.user?.email) {
    return NextResponse.json({ skipped: true, reason: 'email_not_found' })
  }

  const lang = profile.preferred_lang ?? 'ko'
  const subjects: Record<string, string> = {
    ko: '[GlobalMatch] 계정 임시 정지 안내',
    en: '[GlobalMatch] Account Suspension Notice',
    ja: '[GlobalMatch] アカウント一時停止のお知らせ',
    zh: '[GlobalMatch] 账号暂停通知',
  }
  const bodies: Record<string, string> = {
    ko: '외부 플랫폼 유도 행위 3회 적발로 계정이 임시 정지되었습니다. 이의가 있으신 경우 support@globalmatch.app으로 문의해 주세요.',
    en: 'Your account has been suspended after 3 violations of our external platform policy. To appeal, contact support@globalmatch.app.',
    ja: '外部プラットフォームへの誘導行為が3回確認されたため、アカウントを一時停止しました。異議がある場合は support@globalmatch.app までご連絡ください。',
    zh: '由于3次引导至外部平台的违规行为，您的账号已被暂停。如有异议，请联系 support@globalmatch.app。',
  }

  const subject = subjects[lang] ?? subjects.en
  const bodyText = bodies[lang] ?? bodies.en
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#e91e63">${subject}</h2>
  <p style="font-size:16px;color:#333">${bodyText}</p>
  <p style="font-size:12px;color:#999;margin-top:32px">GlobalMatch</p>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'GlobalMatch <noreply@globalmatch.app>',
        to: [authUser.user.email],
        subject,
        html,
      }),
    })
    if (!res.ok) return NextResponse.json({ sent: false, reason: 'resend_error' })
  } catch {
    return NextResponse.json({ sent: false, reason: 'network_error' })
  }

  return NextResponse.json({ sent: true })
}
