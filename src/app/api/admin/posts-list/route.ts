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
  const rl = await checkRateLimit(`admin-posts-list:${ip}`, 'general')
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
  const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '12', 10) || 12, 1), 50)
  const search = sp.get('search') ?? undefined

  try {
    let query = supabaseService
      .from('posts')
      .select(`
        id, user_id, caption, is_public, likes_count, comments_count, created_at,
        profiles!posts_user_id_fkey (full_name, email, avatar_url),
        post_media (media_url, media_type)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      const safeSearch = search.replace(/[%_\\,()]/g, '\\$&').slice(0, 100)
      if (safeSearch) query = query.ilike('caption', `%${safeSearch}%`)
    }

    const from = (page - 1) * limit
    const { data, count, error } = await query.range(from, from + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ posts: data ?? [], total: count ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
