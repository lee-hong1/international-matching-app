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
  const rl = await checkRateLimit(`admin-stats:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user?.email || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      totalUsersQuery,
      verifiedUsersQuery,
      premiumUsersQuery,
      totalMatchesQuery,
      totalMessagesQuery,
      dailyActiveUsersQuery,
      dailySignupsQuery,
      revenueQuery,
      pendingReportsQuery,
    ] = await Promise.all([
      supabaseService.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseService.from('profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabaseService.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
      supabaseService.from('matches').select('id', { count: 'exact', head: true }),
      supabaseService.from('messages').select('id', { count: 'exact', head: true }),
      supabaseService.from('profiles').select('id', { count: 'exact', head: true })
        .gte('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabaseService.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      // aggregate: PostgREST sum to avoid row-limit truncation on large datasets
      supabaseService.from('payments').select('amount.sum(), amount.count()').eq('payment_status', 'completed').single(),
      supabaseService.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    const revenueData = revenueQuery.data as { sum: number | null; count: number | null } | null
    const totalRevenue = revenueData?.sum ?? 0
    const paymentCount = revenueData?.count ?? 0
    const avgOrderValue = paymentCount > 0 ? Math.round(totalRevenue / paymentCount) : 0

    return NextResponse.json({
      totalUsers: totalUsersQuery.count ?? 0,
      verifiedUsers: verifiedUsersQuery.count ?? 0,
      premiumUsers: premiumUsersQuery.count ?? 0,
      totalMatches: totalMatchesQuery.count ?? 0,
      totalMessages: totalMessagesQuery.count ?? 0,
      dailyActiveUsers: dailyActiveUsersQuery.count ?? 0,
      dailySignups: dailySignupsQuery.count ?? 0,
      revenue: totalRevenue,
      avgOrderValue,
      pendingReports: pendingReportsQuery.count ?? 0,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
