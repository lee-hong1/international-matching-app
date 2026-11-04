import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reportingService } from '@/lib/reporting'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// 사용자 차단 — blockerId는 JWT에서 추출 (IDOR 방지)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`blocks:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const { blockedUserId, reason } = await req.json()

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (user.id === blockedUserId) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      )
    }

    const success = await reportingService.blockUser(user.id, blockedUserId, reason || '차단됨')

    if (!success) {
      return NextResponse.json(
        { error: 'User is already blocked or operation failed' },
        { status: 409 }
      )
    }

    return NextResponse.json({ message: 'User blocked successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// 내 차단 목록 — JWT에서 userId 추출 (타인 차단 목록 조회 방지)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const { blocks, total } = await reportingService.getBlockedUsers(user.id, page, limit)

    return NextResponse.json({
      blocks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}