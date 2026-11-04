import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isValidUuid } from '@src/lib/commerce'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
)

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// POST /api/posts/comments — 댓글 작성 (본인 user_id만 허용, IDOR 방지)
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`post-comment:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const { post_id, content, parent_comment_id } = body

  if (!post_id || !isValidUuid(post_id)) {
    return NextResponse.json({ error: 'Invalid post_id' }, { status: 400 })
  }
  if (typeof content !== 'string' || content.trim().length === 0 || content.length > 500) {
    return NextResponse.json({ error: 'content must be 1–500 characters' }, { status: 400 })
  }
  if (parent_comment_id && !isValidUuid(parent_comment_id)) {
    return NextResponse.json({ error: 'Invalid parent_comment_id' }, { status: 400 })
  }

  const { data: post } = await supabaseService.from('posts').select('id').eq('id', post_id).single()
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const insertRow: Record<string, unknown> = {
    post_id,
    user_id: user.id,
    content: content.trim(),
  }
  if (parent_comment_id) insertRow.parent_comment_id = parent_comment_id

  const { data: comment, error } = await supabaseService
    .from('post_comments')
    .insert(insertRow)
    .select('id, post_id, user_id, content, likes_count, created_at, profiles!post_comments_user_id_fkey (id, full_name, avatar_url)')
    .single()

  if (error || !comment) {
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }

  // comments_count 증가
  await supabaseService.rpc('increment_comments_count', { p_post_id: post_id }).catch(() => {})

  return NextResponse.json({ comment }, { status: 201 })
}
