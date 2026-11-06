import { NextRequest, NextResponse } from 'next/server'
import { reportingService } from '@/lib/reporting'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'

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
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  try {
    const { blockedUserId, reason } = await req.json()

    if (!blockedUserId || !isValidUuid(blockedUserId)) {
      return NextResponse.json(
        { error: 'Valid blockedUserId (UUID) is required' },
        { status: 400 }
      )
    }

    if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 500)) {
      return NextResponse.json({ error: 'reason must be a string under 500 characters' }, { status: 400 })
    }

    if (user.id === blockedUserId) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      )
    }

    const success = await reportingService.blockUser(user.id, blockedUserId, reason || 'blocked')

    if (!success) {
      return NextResponse.json(
        { error: 'User is already blocked or operation failed' },
        { status: 409 }
      )
    }

    return NextResponse.json({ message: 'User blocked successfully' })
  } catch (error) {
    console.error('[blocks POST]', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 내 차단 목록 — JWT에서 userId 추출 (타인 차단 목록 조회 방지)
export async function GET(req: NextRequest) {
  const getIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const getRl = await checkRateLimit(`blocks-get:${getIp}`, 'general')
  if (!getRl.allowed) {
    const r = rateLimitResponse(getRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const page = Math.max(Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1, 1)
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
    const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 100)

    const { blocks, total } = await reportingService.getBlockedUsers(user.id, page, limit)

    return NextResponse.json({
      blocks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[blocks GET]', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}