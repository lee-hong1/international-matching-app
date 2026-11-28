import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid, hasForbiddenContent } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { detectExternalPlatform } from '@src/lib/chat-safety'

// GET /api/posts/:id — 단건 게시물 조회
// is_public=true: 비인증도 허용. is_adult 콘텐츠: 인증 + is_adult 프로필 필요.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`posts-get:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { id } = await params
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  const { data: post, error } = await supabaseService
    .from('posts')
    .select(`
      id, user_id, caption, is_public, is_adult, likes_count, comments_count, created_at,
      profiles!posts_user_id_fkey (id, full_name, avatar_url,
        creator_profiles (display_name)
      ),
      post_media (media_url, media_type, sort_order)
    `)
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116' || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }

  // 비공개 게시물: 소유자만 접근 가능
  if (!post.is_public) {
    const user = await getAuthUser(req)
    if (!user || user.id !== post.user_id) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
  }

  // 성인 콘텐츠: 인증 + is_adult 필수 (청소년보호법)
  if (post.is_adult) {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Age verification required', redirect: '/onboarding/verify-age' },
        { status: 403 }
      )
    }
    const { data: profile } = await supabaseService
      .from('profiles').select('is_adult').eq('id', user.id).single()
    if (!profile?.is_adult) {
      return NextResponse.json(
        { error: 'Age verification required', redirect: '/onboarding/verify-age' },
        { status: 403 }
      )
    }
  }

  return NextResponse.json({ post })
}

// PATCH /api/posts/:id — 게시물 수정 (소유자 전용)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`posts-patch:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const rlPatchUser = await checkRateLimit(`posts-patch:user:${user.id}`, 'general')
  if (!rlPatchUser.allowed) {
    const r = rateLimitResponse(rlPatchUser.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { id } = await params
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  // 소유권 확인 (IDOR 방지)
  const { data: existing, error: fetchErr } = await supabaseService
    .from('posts')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchErr?.code === 'PGRST116' || !existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  if (fetchErr) {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 허용 필드 화이트리스트 (user_id, is_adult 등 민감 필드 수정 불가)
  const updates: Record<string, unknown> = {}

  if ('caption' in body) {
    if (body.caption !== null && typeof body.caption !== 'string') {
      return NextResponse.json({ error: 'caption must be a string or null' }, { status: 400 })
    }
    const caption = typeof body.caption === 'string' ? body.caption.slice(0, 2200) : null
    if (caption && hasForbiddenContent(caption)) {
      return NextResponse.json({ error: 'Caption contains prohibited content' }, { status: 400 })
    }
    if (caption && detectExternalPlatform(caption)) {
      return NextResponse.json({ error: 'External platform references are not allowed' }, { status: 400 })
    }
    updates.caption = caption
  }

  if ('is_public' in body) {
    if (typeof body.is_public !== 'boolean') {
      return NextResponse.json({ error: 'is_public must be a boolean' }, { status: 400 })
    }
    updates.is_public = body.is_public
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error: updateErr } = await supabaseService
    .from('posts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, caption, is_public, updated_at')
    .single()

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }

  return NextResponse.json({ post: updated })
}

// DELETE /api/posts/:id — 게시물 삭제 (소유자 전용)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`posts-delete:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const rlDeleteUser = await checkRateLimit(`posts-delete:user:${user.id}`, 'general')
  if (!rlDeleteUser.allowed) {
    const r = rateLimitResponse(rlDeleteUser.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const { id } = await params
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  // 소유권 + 미디어 URL 동시 조회 (Storage 파일 삭제용)
  const { data: existing, error: fetchErr } = await supabaseService
    .from('posts')
    .select('user_id, post_media (media_url)')
    .eq('id', id)
    .single()

  if (fetchErr?.code === 'PGRST116' || !existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  if (fetchErr) {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: deleteErr } = await supabaseService
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteErr) {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }

  // DB 삭제 성공 후 Storage 미디어 파일 정리 (fire-and-forget)
  const mediaItems = (existing.post_media as { media_url: string }[] | null) ?? []
  if (mediaItems.length > 0) {
    void (async () => {
      try {
        const paths: string[] = []
        for (const item of mediaItems) {
          if (!item.media_url) continue
          const url = new URL(item.media_url)
          const match = url.pathname.match(/\/storage\/v1\/object\/public\/posts\/(.+)$/)
          if (match?.[1]) paths.push(decodeURIComponent(match[1]))
        }
        if (paths.length > 0) {
          await supabaseService.storage.from('posts').remove(paths)
        }
      } catch {
        // URL 파싱 실패는 무시 — DB 삭제는 이미 완료됨
      }
    })()
  }

  return NextResponse.json({ success: true })
}
