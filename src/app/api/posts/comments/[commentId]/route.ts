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

// DELETE /api/posts/comments/:commentId — 본인 댓글 삭제 (IDOR 방지)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`post-comment-del:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { commentId } = await params
  if (!isValidUuid(commentId)) {
    return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 })
  }

  const { data: comment } = await supabaseService
    .from('post_comments').select('id, user_id, post_id').eq('id', commentId).single()

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  if (comment.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseService.from('post_comments').delete().eq('id', commentId)
  if (error) return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })

  await supabaseService.rpc('decrement_comments_count', { p_post_id: comment.post_id }).catch(() => {})

  return NextResponse.json({ success: true })
}
