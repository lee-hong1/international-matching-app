import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`follows-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const type = searchParams.get('type') ?? 'followers'
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 200)

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  if (!isValidUuid(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  const VALID_FOLLOW_TYPES = ['followers', 'following', 'stats']
  if (!VALID_FOLLOW_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type must be followers, following, or stats' }, { status: 400 })
  }

  try {
    const { data: creatorProfile } = await supabaseService
      .from('creator_profiles')
      .select('followers_count, following_count')
      .eq('id', userId)
      .single()

    if (type === 'stats') {
      return NextResponse.json({
        followers_count: creatorProfile?.followers_count ?? 0,
        following_count: creatorProfile?.following_count ?? 0,
      })
    }

    const column = type === 'followers' ? 'following_id' : 'follower_id'
    const joinColumn = type === 'followers' ? 'follower_id' : 'following_id'
    const fkName = type === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'

    const { data, error } = await supabaseService
      .from('follows')
      .select(`
        ${joinColumn},
        profiles!${fkName} (id, full_name, avatar_url, country,
          creator_profiles (display_name, category, followers_count)
        )
      `)
      .eq(column, userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[follows GET] db error:', error.code)
      return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 })
    }

    const users = data?.map((row: Record<string, unknown>) => row.profiles).filter(Boolean) ?? []
    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const postIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const postRl = await checkRateLimit(`follows-post:${postIp}`, 'general')
  if (!postRl.allowed) {
    const r = rateLimitResponse(postRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

  let following_id: string
  try {
    const body = await request.json()
    following_id = body.following_id
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!following_id || !isValidUuid(following_id)) {
    return NextResponse.json({ error: 'Valid following_id (UUID) is required' }, { status: 400 })
  }

  if (following_id === user.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  const { error } = await supabaseService
    .from('follows')
    .insert({ follower_id: user.id, following_id })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already following' }, { status: 409 })
    }
    console.error('[follows POST] db error:', error.code)
    return NextResponse.json({ error: 'Failed to follow' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const delIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const delRl = await checkRateLimit(`follows-delete:${delIp}`, 'general')
  if (!delRl.allowed) {
    const r = rateLimitResponse(delRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const followingId = searchParams.get('following_id')

  if (!followingId) {
    return NextResponse.json({ error: 'following_id is required' }, { status: 400 })
  }
  if (!isValidUuid(followingId)) {
    return NextResponse.json({ error: 'Invalid following_id' }, { status: 400 })
  }

  const { error } = await supabaseService
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId)

  if (error) {
    console.error('[follows DELETE] db error:', error.code)
    return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
