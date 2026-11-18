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
  const rl = await checkRateLimit(`admin-country-stats:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user?.email || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use RPC for server-side aggregation; avoids PostgREST row-limit truncation
    const rpcResult = await supabaseService.rpc('analytics_countries_rpc')
    if (!rpcResult.error && rpcResult.data) {
      return NextResponse.json(rpcResult.data)
    }

    // Fallback: fetch with a high explicit limit to avoid silent 1000-row truncation
    const { data, error } = await supabaseService
      .from('profiles')
      .select('country')
      .limit(100000)
    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const countryStats = (data ?? []).reduce((acc: Record<string, number>, profile) => {
      const country = profile.country || 'Unknown'
      acc[country] = (acc[country] ?? 0) + 1
      return acc
    }, {})

    const result = Object.entries(countryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
