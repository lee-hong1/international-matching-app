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
  const rl = await checkRateLimit(`admin-reports-list:${ip}`, 'general')
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
  const status = sp.get('status') ?? undefined

  try {
    let query = supabaseService
      .from('reports')
      .select(`
        id, reason, description, status, created_at, resolved_at,
        reporter:profiles!reports_reporter_id_fkey(id, full_name, email),
        reported:profiles!reports_reported_id_fkey(id, full_name, email)
      `, { count: 'exact' })

    if (status) query = query.eq('status', status)

    const from = (page - 1) * limit
    const { data: reports, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ reports: reports ?? [], total: count ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
