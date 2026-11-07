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

// base64url → string 디코딩 (Edge Runtime 호환 — Buffer 없이 atob 사용)
function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  return atob(padded)
}

// JWT payload에서 app_metadata 추출 (서명 검증 없음 — Supabase 발급 토큰 신뢰)
// 미들웨어 성능 우선: DB 조회 없이 JWT 클레임만 사용
function getAppMetadataFromJwt(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return {}
    const payload = JSON.parse(base64urlDecode(parts[1]))
    return (payload?.app_metadata as Record<string, unknown>) ?? {}
  } catch {
    return {}
  }
}

// 페이지 라우트용 정지 체크 — JWT app_metadata 사용 (DB 조회 없음, 빠름)
// 주의: JWT 만료까지 최대 1시간 지연 가능. DB 최신 상태는 API route의 isSuspended()가 보장.
function checkSuspendedViaJwt(request: NextRequest): NextResponse | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  const token = extractToken(request, supabaseUrl)
  if (!token) return null  // 비로그인 사용자는 패스 (로그인 화면으로 가게 됨)
  const meta = getAppMetadataFromJwt(token)
  if (meta.is_suspended === true) {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }
  return null
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

    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
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

async function handleSuspendedCheck(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const accessToken = extractToken(request, supabaseUrl)
  if (!accessToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(accessToken)

    if (authErr || !user) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single()

    if (profile?.is_suspended) {
      return NextResponse.json(
        { error: '계정이 정지되었습니다 / Account suspended' },
        { status: 403 }
      )
    }

    return NextResponse.next()
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
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

    // Service role로 is_adult + is_suspended 확인
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_adult, is_suspended')
      .eq('id', user.id)
      .single()

    if (profile?.is_suspended === true) {
      return NextResponse.json(
        { error: '계정이 정지되었습니다 / Account suspended' },
        { status: 403 },
      )
    }

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
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(accessToken)

    if (authErr || !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_adult, is_suspended')
      .eq('id', user.id)
      .single()

    // DB 최신 정지 상태 확인 — JWT 클레임 지연(최대 1시간) 보완
    if (profile?.is_suspended === true) {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }

    if (!profile || profile.is_adult !== true) {
      // 페이지 라우트: 403 대신 연령 인증 페이지로 리디렉션
      const verifyUrl = new URL('/onboarding/verify-age', request.url)
      verifyUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
      return NextResponse.redirect(verifyUrl)
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/onboarding/verify-age', request.url))
  }
}

// 정지 계정이 직접 URL로 접근 차단해야 하는 페이지 경로 목록
// 청소년보호법: 성인 플랫폼 모든 콘텐츠 페이지는 미인증 접근 금지
const PROTECTED_PAGE_PATHS = [
  '/feed', '/discover', '/bookings', '/book', '/host', '/profile', '/messages', '/dashboard', '/analytics',
  '/events',    // 이벤트 목록/상세 — 성인 콘텐츠 포함 가능
  '/explore',   // 크리에이터 탐색 — 성인 플랫폼
  '/matches',   // 상호 팔로우 — 연애/만남 목적
  '/creator',   // 크리에이터 프로필 — 성인 콘텐츠 포함 가능
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /suspended, /auth/**, /login, /signup, /_next, /favicon.ico 는 항상 허용
  if (
    pathname === '/suspended' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/onboarding/')
  ) {
    return NextResponse.next()
  }

  // 일반 페이지 라우트: JWT app_metadata로 정지 체크 (DB 조회 없음, 빠름)
  if (PROTECTED_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const suspendedRedirect = checkSuspendedViaJwt(request)
    if (suspendedRedirect) return suspendedRedirect
  }

  if (pathname.startsWith('/admin')) {
    return handleAdminRoute(request)
  }

  // 채팅 API: 정지 계정 차단 (외부 플랫폼 유도 3회 적발 시) — DB 최신 상태 보장
  if (pathname.startsWith('/api/chat/')) {
    return handleSuspendedCheck(request)
  }

  // 예약 생성(POST): 정지 계정 차단
  if (pathname === '/api/bookings' && request.method === 'POST') {
    return handleSuspendedCheck(request)
  }

  // 호스트 등록/관리 API: JWT + is_adult 검증 → 미인증 시 403
  if (pathname.startsWith('/api/host')) {
    return handleHostApiRoute(request)
  }

  // 성인 플랫폼 콘텐츠 페이지: 미인증 미성년자 차단 (청소년보호법)
  // JWT fast-path는 app_metadata.is_adult 미존재 가능 → DB 체크 필수
  if (
    pathname.startsWith('/explore') ||
    pathname.startsWith('/matches') ||
    pathname.startsWith('/creator') ||
    pathname.startsWith('/events')
  ) {
    return handleHostPageRoute(request)
  }

  // 호스트 페이지 라우트: 미인증 시 /onboarding/verify-age 리디렉션
  if (pathname.startsWith('/host')) {
    return handleHostPageRoute(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth/:path*',
    '/api/chat/:path*',
    '/api/bookings',
    '/api/host/:path*',
    '/host/:path*',
    // 단독 경로 + 하위 경로 모두 매칭 필요 (/:path*는 하위만 매칭)
    '/feed', '/feed/:path*',
    '/discover', '/discover/:path*',
    '/bookings', '/bookings/:path*',
    '/book/:path+',
    '/profile', '/profile/:path*',
    '/messages', '/messages/:path*',
    '/dashboard', '/dashboard/:path*',
    '/analytics', '/analytics/:path*',
    '/events', '/events/:path*',   // 청소년보호법: 이벤트 전체 경로
    '/explore', '/explore/:path*', // 청소년보호법: 탐색 페이지
    '/matches', '/matches/:path*', // 청소년보호법: 매칭 페이지
    '/creator', '/creator/:path*', // 청소년보호법: 크리에이터 프로필
    '/suspended',
    '/login',
    '/signup',
    '/onboarding/:path*',
    '/auth/:path*',
  ],
}
