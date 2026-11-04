import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'
)

export interface Post {
  id: string
  user_id: string
  caption: string | null
  location: string | null
  is_public: boolean
  likes_count: number
  comments_count: number
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
    country: string | null
    creator_profiles?: { display_name: string | null; category: string | null } | null
  } | null
  post_media: { id: string; media_url: string; media_type: string; order_index: number }[]
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  likes_count: number
  created_at: string
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  // JWT는 Supabase 세션에서 가져옴
  const session = JSON.parse(
    localStorage.getItem(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0]}-auth-token`
    ) ?? 'null'
  )
  const token = session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const postsService = {
  async getPost(postId: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, user_id, caption, location, is_public, likes_count, comments_count, created_at,
        profiles!posts_user_id_fkey (id, full_name, avatar_url, country,
          creator_profiles (display_name, category)
        ),
        post_media (id, media_url, media_type, order_index)
      `)
      .eq('id', postId)
      .single()
    if (error || !data) return null
    return data as unknown as Post
  },

  async getFeed(limit = 12, offset = 0): Promise<Post[]> {
    const { data, error } = await supabase
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
    if (error) return []
    return (data ?? []) as unknown as Post[]
  },

  async explorePublicPosts(limit = 18): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, user_id, caption, location, is_public, likes_count, comments_count, created_at,
        profiles!posts_user_id_fkey (id, full_name, avatar_url, country,
          creator_profiles (display_name, category)
        ),
        post_media (id, media_url, media_type, order_index)
      `)
      .eq('is_public', true)
      .order('likes_count', { ascending: false })
      .limit(limit)
    if (error) return []
    return (data ?? []) as unknown as Post[]
  },

  async getUserPosts(userId: string, limit = 24): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, user_id, caption, location, is_public, likes_count, comments_count, created_at,
        profiles!posts_user_id_fkey (id, full_name, avatar_url, country,
          creator_profiles (display_name, category)
        ),
        post_media (id, media_url, media_type, order_index)
      `)
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return (data ?? []) as unknown as Post[]
  },

  async getComments(postId: string): Promise<PostComment[]> {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        id, post_id, user_id, content, likes_count, created_at,
        profiles!post_comments_user_id_fkey (id, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) return []
    return (data ?? []) as unknown as PostComment[]
  },

  async addComment(postId: string, content: string): Promise<{ comment: PostComment | null; error?: string }> {
    const res = await fetch('/api/posts/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ post_id: postId, content }),
    })
    if (!res.ok) return { comment: null, error: 'Failed to add comment' }
    const data = await res.json()
    return { comment: data.comment }
  },

  async deleteComment(commentId: string): Promise<{ error?: string }> {
    const res = await fetch(`/api/posts/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    })
    if (!res.ok) return { error: 'Failed to delete comment' }
    return {}
  },

  async likePost(postId: string): Promise<void> {
    await fetch(`/api/posts/${postId}/likes`, {
      method: 'POST',
      headers: getAuthHeader(),
    })
  },

  async unlikePost(postId: string): Promise<void> {
    await fetch(`/api/posts/${postId}/likes`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    })
  },
}
