import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 유효하지 않습니다' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'feed'
  const userId = searchParams.get('userId')
  const limit = parseInt(searchParams.get('limit') ?? '12')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    let query = supabase
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
      query = query.eq('user_id', userId)
    } else if (type === 'explore') {
      query = query.order('likes_count', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const caption = formData.get('caption') as string | null
    const location = formData.get('location') as string | null
    const isPublic = formData.get('is_public') !== 'false'
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 유효하지 않습니다' }, { status: 401 })
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({ user_id: user.id, caption, location, is_public: isPublic })
      .select()
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: postError?.message }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
