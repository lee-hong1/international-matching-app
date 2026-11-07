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
  const rl = await checkRateLimit(`admin-monthly-stats:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user?.email || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawMonths = req.nextUrl.searchParams.get('months')
  const months = Math.min(Math.max(parseInt(rawMonths ?? '12', 10) || 12, 1), 24)

  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - months)

    const [usersQuery, matchesQuery, revenueQuery] = await Promise.all([
      supabaseService.from('profiles').select('created_at').gte('created_at', startDate.toISOString()),
      supabaseService.from('matches').select('created_at').gte('created_at', startDate.toISOString()),
      supabaseService.from('payments').select('amount, created_at')
        .eq('payment_status', 'completed').gte('created_at', startDate.toISOString()),
    ])

    const monthlyData = []
    for (let i = 0; i < months; i++) {
      const monthStart = new Date()
      monthStart.setMonth(endDate.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthStart.getMonth() + 1)

      const monthUsers = (usersQuery.data ?? []).filter((u) => {
        const d = new Date(u.created_at)
        return d >= monthStart && d < monthEnd
      }).length

      const monthMatches = (matchesQuery.data ?? []).filter((m) => {
        const d = new Date(m.created_at)
        return d >= monthStart && d < monthEnd
      }).length

      const monthRevenue = (revenueQuery.data ?? [])
        .filter((p) => { const d = new Date(p.created_at); return d >= monthStart && d < monthEnd })
        .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

      monthlyData.unshift({
        month: monthStart.toISOString().slice(0, 7),
        users: monthUsers,
        matches: monthMatches,
        revenue: monthRevenue,
      })
    }

    return NextResponse.json(monthlyData)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
