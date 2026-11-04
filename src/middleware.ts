import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function extractToken(request: NextRequest, supabaseUrl: string): string | undefined {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return (
    request.cookies.get('sb-access-token')?.value ??
    request.cookies.get(`sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`)?.value
  )
}

async function handleAdminRoute(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const accessToken = extractToken(request, supabaseUrl)
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)

    if (!adminEmails.includes(user.email ?? '')) {
      return NextResponse.redirect(new URL('/feed', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

async function handleHostApiRoute(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const accessToken = extractToken(request, supabaseUrl)
  if (!accessToken) {
    return NextResponse.json(
      { error: '인증이 필요합니다 / Authentication required' },
      { status: 401 },
    )
  }

  try {
    // JWT에서 user 추출 (body에서 절대 받지 않음 — IDOR 방지)
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(accessToken)

    if (authErr || !user) {
      return NextResponse.json(
        { error: '인증이 유효하지 않습니다 / Invalid auth token' },
        { status: 401 },
      )
    }

    // Service role로 is_adult 확인 (RLS 우회 불가능하므로 service key 사용)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_adult')
      .eq('id', user.id)
      .single()

    if (!profile || profile.is_adult !== true) {
      return NextResponse.json(
        {
          error: '성인 인증이 필요합니다 / Age verification required (청소년보호법)',
          redirect: '/verify-age',
        },
        { status: 403 },
      )
    }

    return NextResponse.next()
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

async function handleHostPageRoute(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.redirect(new URL('/onboarding/verify-age', request.url))
  }

  const accessToken = extractToken(request, supabaseUrl)
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(accessToken)

    if (authErr || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_adult')
      .eq('id', user.id)
      .single()

    if (!profile || profile.is_adult !== true) {
      // 페이지 라우트: 403 대신 연령 인증 페이지로 리디렉션
      return NextResponse.redirect(new URL('/onboarding/verify-age', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/onboarding/verify-age', request.url))
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    return handleAdminRoute(request)
  }

  // /api/auth/** 는 항상 허용 (verify-age 포함, 무한 루프 방지)
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // 호스트 등록/관리 API: JWT + is_adult 검증 → 미인증 시 403
  if (pathname.startsWith('/api/host')) {
    return handleHostApiRoute(request)
  }

  // 호스트 페이지 라우트: 미인증 시 /onboarding/verify-age 리디렉션
  if (pathname.startsWith('/host')) {
    return handleHostPageRoute(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/host/:path*', '/api/auth/:path*', '/host/:path*'],
}
