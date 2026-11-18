import { NextResponse } from 'next/server'

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const OPTIONAL_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'FIREBASE_PROJECT_ID',
  'PLATFORM_COMMISSION_RATE',
]

export async function GET() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    // 환경변수 이름은 외부에 노출하지 않음 (OWASP A03: 민감 데이터 노출 방지)
    return NextResponse.json(
      { status: 'error', reason: 'missing_required_config' },
      { status: 503 }
    )
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
