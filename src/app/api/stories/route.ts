import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`stories:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  let query = supabaseService
    .from('stories')
    .select(`
      id, user_id, media_url, media_type, caption, bg_color, views_count, expires_at, created_at,
      profiles!stories_user_id_fkey (id, full_name, avatar_url,
        creator_profiles (display_name)
      )
    `)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[stories GET] db error:', error.code)
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
  }

  return NextResponse.json({ stories: data ?? [] })
}

export async function DELETE(request: NextRequest) {
  const delIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const delRl = await checkRateLimit(`stories-delete:${delIp}`, 'general')
  if (!delRl.allowed) {
    const r = rateLimitResponse(delRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storyId = searchParams.get('storyId')

  if (!storyId || !isValidUuid(storyId)) {
    return NextResponse.json({ error: 'Valid storyId (UUID) is required' }, { status: 400 })
  }

  const { error } = await supabaseService
    .from('stories')
    .delete()
    .eq('id', storyId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[stories DELETE] db error:', error.code)
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
