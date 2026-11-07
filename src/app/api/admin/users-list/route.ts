import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, getAuthUser } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return adminEmails.length > 0 && adminEmails.includes(email.toLowerCase())
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`admin-users-list:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user?.email || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const page = Math.max(parseInt(sp.get('page') ?? '1', 10) || 1, 1)
  const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '20', 10) || 20, 1), 100)
  const search = sp.get('search') ?? undefined
  const verificationStatus = sp.get('verificationStatus') ?? undefined
  const isPremiumParam = sp.get('isPremium')
  const isPremium = isPremiumParam === null ? undefined : isPremiumParam === 'true'
  const country = sp.get('country') ?? undefined

  try {
    let query = supabaseService
      .from('profiles')
      .select('id, email, full_name, country, gender, verification_status, is_premium, created_at, last_active', { count: 'exact' })

    if (search) {
      const safeSearch = search.replace(/[%_\\,()]/g, '\\$&').slice(0, 100)
      if (safeSearch) {
        query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
      }
    }
    if (verificationStatus) query = query.eq('verification_status', verificationStatus)
    if (isPremium !== undefined) query = query.eq('is_premium', isPremium)
    if (country) query = query.eq('country', country)

    const from = (page - 1) * limit
    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // N+1 방지: 페이지 사용자 전체 통계를 2개 쿼리로 일괄 조회
    const userIds = (users ?? []).map((u) => u.id as string)
    const [matchesData, messagesData] = await Promise.all([
      userIds.length > 0
        ? supabaseService.from('matches').select('user1_id, user2_id')
            .or(userIds.flatMap((id) => [`user1_id.eq.${id}`, `user2_id.eq.${id}`]).join(','))
        : Promise.resolve({ data: [] as { user1_id: string; user2_id: string }[] }),
      userIds.length > 0
        ? supabaseService.from('messages').select('sender_id').in('sender_id', userIds)
        : Promise.resolve({ data: [] as { sender_id: string }[] }),
    ])

    const matchCounts: Record<string, number> = {}
    const messageCounts: Record<string, number> = {}
    ;(matchesData.data ?? []).forEach((m) => {
      matchCounts[m.user1_id] = (matchCounts[m.user1_id] ?? 0) + 1
      matchCounts[m.user2_id] = (matchCounts[m.user2_id] ?? 0) + 1
    })
    ;(messagesData.data ?? []).forEach((m) => {
      messageCounts[m.sender_id] = (messageCounts[m.sender_id] ?? 0) + 1
    })

    const usersWithStats = (users ?? []).map((u) => ({
      ...u,
      total_matches: matchCounts[u.id as string] ?? 0,
      total_messages: messageCounts[u.id as string] ?? 0,
    }))

    return NextResponse.json({ users: usersWithStats, total: count ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
