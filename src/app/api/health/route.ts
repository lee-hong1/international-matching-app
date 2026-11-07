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
  const optionalMissing = OPTIONAL_ENV_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    return NextResponse.json(
      { status: 'error', missing_required: missing },
      { status: 503 }
    )
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    missing_optional: optionalMissing.length > 0 ? optionalMissing : undefined,
  })
}
