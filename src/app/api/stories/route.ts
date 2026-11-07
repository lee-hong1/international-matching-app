import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { getAuthUser, supabaseService, isValidUuid } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'
import { detectExternalPlatform } from '@src/lib/chat-safety'

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

  const rawLimit = parseInt(new URL(request.url).searchParams.get('limit') ?? '50', 10)
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50, 200)

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
    .limit(limit)

  if (userId) {
    if (!isValidUuid(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[stories GET] db error:', error.code)
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
  }

  return NextResponse.json({ stories: data ?? [] })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`stories-create:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
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
  const { data: storyCreatorProfile } = await supabaseService
    .from('profiles').select('is_adult').eq('id', user.id).single()
  if (!storyCreatorProfile?.is_adult) {
    return NextResponse.json(
      { error: 'Age verification required', redirect: '/onboarding/verify-age' },
      { status: 403 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const media = formData.get('media')
  if (!media || !(media instanceof Blob)) {
    return NextResponse.json({ error: 'media file is required' }, { status: 400 })
  }

  const MAX_SIZE = 50 * 1024 * 1024
  if (media.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 })
  }

  const caption = formData.get('caption')
  const captionStr = typeof caption === 'string' ? caption.slice(0, 200) : null

  if (captionStr && detectExternalPlatform(captionStr)) {
    return NextResponse.json({ error: 'External platform references not allowed in caption' }, { status: 400 })
  }

  const isVideo = media.type.startsWith('video/')
  // SVG 차단: image/svg+xml 은 <script> 실행 가능 → XSS 벡터
  const isImage = media.type.startsWith('image/') && media.type !== 'image/svg+xml'
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: 'Only image or video files are allowed (SVG not permitted)' }, { status: 400 })
  }

  const ext = media.type.split('/')[1]?.split(';')[0] ?? (isVideo ? 'mp4' : 'jpg')
  const fileName = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseService.storage
    .from('stories')
    .upload(fileName, media, { contentType: media.type, upsert: false })

  if (uploadError) {
    console.error('[stories POST] storage upload error:', uploadError.message)
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseService.storage.from('stories').getPublicUrl(fileName)

  const { data: story, error: insertError } = await supabaseService
    .from('stories')
    .insert({
      user_id: user.id,
      media_url: publicUrl,
      media_type: isVideo ? 'video' : 'image',
      caption: captionStr,
    })
    .select('id, user_id, media_url, media_type, caption, expires_at, created_at')
    .single()

  if (insertError) {
    console.error('[stories POST] insert error:', insertError.code)
    await supabaseService.storage.from('stories').remove([fileName])
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 })
  }

  return NextResponse.json({ story }, { status: 201 })
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
