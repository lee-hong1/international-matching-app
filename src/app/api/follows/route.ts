import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const type = searchParams.get('type') ?? 'followers'

  if (!userId) {
    return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 })
  }

  try {
    const { data: creatorProfile } = await supabase
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

    const { data, error } = await supabase
      .from('follows')
      .select(`
        ${joinColumn},
        profiles!${fkName} (id, full_name, avatar_url, country,
          creator_profiles (display_name, category, followers_count)
        )
      `)
      .eq(column, userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = data?.map((row: any) => row.profiles).filter(Boolean) ?? []
    return NextResponse.json({ users })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { following_id } = await request.json()
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 유효하지 않습니다' }, { status: 401 })
    }

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const followingId = searchParams.get('following_id')
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !followingId) {
      return NextResponse.json({ error: '필수 파라미터가 없습니다' }, { status: 400 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 유효하지 않습니다' }, { status: 401 })
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
