import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { isValidUuid } from '@src/lib/commerce'
import { supabase } from '@/lib/supabase'
import { supabaseService } from '@/lib/commerce'

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// POST /api/posts/:id/likes — 좋아요 (멱등성: 이미 있으면 무시)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`post-like:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { id: postId } = await params
  if (!isValidUuid(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
  }

  const { error } = await supabaseService
    .from('post_likes')
    .insert({ post_id: postId, user_id: user.id })

  // 23505 = unique_violation (이미 좋아요 → 무시, 멱등)
  if (error && (error as { code?: string }).code !== '23505') {
    return NextResponse.json({ error: 'Failed to like post' }, { status: 500 })
  }

  if (!error) {
    await supabaseService.rpc('increment_likes_count', { p_post_id: postId }).catch(() => {})
  }

  return NextResponse.json({ liked: true })
}

// DELETE /api/posts/:id/likes — 좋아요 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`post-unlike:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { id: postId } = await params
  if (!isValidUuid(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
  }

  const { error } = await supabaseService
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 })

  await supabaseService.rpc('decrement_likes_count', { p_post_id: postId }).catch(() => {})

  return NextResponse.json({ liked: false })
}
