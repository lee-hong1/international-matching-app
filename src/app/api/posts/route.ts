import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { detectExternalPlatform } from '@src/lib/chat-safety'
import { isSuspended } from '@src/lib/suspended-check'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`posts-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const VALID_POST_TYPES = ['feed', 'user', 'explore'] as const
  type PostType = typeof VALID_POST_TYPES[number]

  const { searchParams } = new URL(request.url)
  const rawType = searchParams.get('type') ?? 'feed'
  if (!VALID_POST_TYPES.includes(rawType as PostType)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_POST_TYPES.join(', ')}` }, { status: 400 })
  }
  const type = rawType as PostType
  const userId = searchParams.get('userId')
  const rawLimit = parseInt(searchParams.get('limit') ?? '12', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 12, 50)
  const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)
  const offset = Math.min(Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0, 10000)

  let query = supabaseService
    .from('posts')
    .select(`
      id, user_id, caption, location, is_public, likes_count, comments_count, created_at,
      profiles!posts_user_id_fkey (id, full_name, avatar_url, country,
        creator_profiles (display_name, category)
      ),
      post_media (id, media_url, media_type, order_index)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type === 'user' && userId) {
    if (!isValidUuid(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }
    query = query.eq('user_id', userId)
  } else if (type === 'explore') {
    query = query.order('likes_count', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error('[posts GET] db error:', error.code)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }

  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(request: NextRequest) {
  const postIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const postRl = await checkRateLimit(`posts-post:${postIp}`, 'general')
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

  // 청소년보호법: 성인 인증 필수
  const { data: posterProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!posterProfile?.is_adult) {
    return NextResponse.json({ error: 'Age verification required', redirect: '/onboarding/verify-age' }, { status: 403 })
  }

  let caption: string | null = null
  let location: string | null = null
  let isPublic = true

  try {
    const formData = await request.formData()
    caption = formData.get('caption') as string | null
    location = formData.get('location') as string | null
    isPublic = formData.get('is_public') !== 'false'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (caption && caption.length > 2000) {
    return NextResponse.json({ error: 'caption must be under 2000 characters' }, { status: 400 })
  }
  if (location && (typeof location !== 'string' || location.length > 300)) {
    return NextResponse.json({ error: 'location must be under 300 characters' }, { status: 400 })
  }

  // 수익 누수 방지: 포스트 캡션에 외부 플랫폼 유도 금지
  if (caption && detectExternalPlatform(caption)) {
    return NextResponse.json({ error: 'External platform references are not allowed' }, { status: 400 })
  }

  const { data: post, error: postError } = await supabaseService
    .from('posts')
    .insert({ user_id: user.id, caption, location, is_public: isPublic })
    .select('id, user_id, caption, location, is_public, created_at')
    .single()

  if (postError || !post) {
    console.error('[posts POST] db error:', postError?.code)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }

  return NextResponse.json({ post }, { status: 201 })
}
