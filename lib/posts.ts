import { supabase } from './supabase'

export interface PostMedia {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  order_index: number
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_comment_id: string | null
  likes_count: number
  created_at: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
  }
  is_liked?: boolean
}

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
    creator_profiles?: {
      display_name: string | null
      category: string | null
    } | null
  }
  post_media: PostMedia[]
  is_liked?: boolean
}

export interface CreatePostData {
  caption?: string
  location?: string
  is_public?: boolean
  mediaFiles: File[]
}

export const postsService = {
  async getFeed(limit = 12, offset = 0): Promise<Post[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // 팔로잉 중인 사용자의 게시물 + 본인 게시물
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = followingData?.map((f) => f.following_id) ?? []
    const feedUserIds = [user.id, ...followingIds]

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, user_id, caption, location, is_public, likes_count, comments_count, created_at,
        profiles!posts_user_id_fkey (id, full_name, avatar_url, country,
          creator_profiles (display_name, category)
        ),
        post_media (id, media_url, media_type, order_index)
      `)
      .in('user_id', feedUserIds)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || !data) return []

    const likedPostIds = await postsService.getLikedPostIds(data.map((p: any) => p.id))

    return data.map((post: any) => ({
      ...post,
      post_media: (post.post_media ?? []).sort((a: PostMedia, b: PostMedia) => a.order_index - b.order_index),
      is_liked: likedPostIds.has(post.id),
    }))
  },

  async getUserPosts(userId: string, limit = 12, offset = 0): Promise<Post[]> {
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
      .range(offset, offset + limit - 1)

    if (error || !data) return []

    const likedPostIds = await postsService.getLikedPostIds(data.map((p: any) => p.id))

    return data.map((post: any) => ({
      ...post,
      post_media: (post.post_media ?? []).sort((a: PostMedia, b: PostMedia) => a.order_index - b.order_index),
      is_liked: likedPostIds.has(post.id),
    }))
  },

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

    const likedPostIds = await postsService.getLikedPostIds([postId])

    return {
      ...data,
      post_media: ((data as any).post_media ?? []).sort((a: PostMedia, b: PostMedia) => a.order_index - b.order_index),
      is_liked: likedPostIds.has(postId),
    } as Post
  },

  async createPost(postData: CreatePostData): Promise<{ post: Post | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { post: null, error: new Error('인증이 필요합니다') }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        caption: postData.caption ?? null,
        location: postData.location ?? null,
        is_public: postData.is_public ?? true,
      })
      .select()
      .single()

    if (postError || !post) return { post: null, error: postError }

    // 미디어 업로드
    const mediaInserts = []
    for (let i = 0; i < postData.mediaFiles.length; i++) {
      const file = postData.mediaFiles[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${post.id}/${Date.now()}-${i}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(fileName, file)

      if (uploadError) continue

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName)

      mediaInserts.push({
        post_id: post.id,
        media_url: publicUrl,
        media_type: file.type.startsWith('video/') ? 'video' : 'image',
        order_index: i,
      })
    }

    if (mediaInserts.length > 0) {
      await supabase.from('post_media').insert(mediaInserts)
    }

    const fullPost = await postsService.getPost(post.id)
    return { post: fullPost, error: null }
  },

  async deletePost(postId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('인증이 필요합니다') }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id)

    return { error }
  },

  async likePost(postId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('인증이 필요합니다') }

    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: user.id })

    return { error }
  },

  async unlikePost(postId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('인증이 필요합니다') }

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)

    return { error }
  },

  async getLikedPostIds(postIds: string[]): Promise<Set<string>> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || postIds.length === 0) return new Set()

    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    return new Set(data?.map((row) => row.post_id) ?? [])
  },

  async getComments(postId: string, limit = 20, offset = 0): Promise<PostComment[]> {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        id, post_id, user_id, content, parent_comment_id, likes_count, created_at,
        profiles!post_comments_user_id_fkey (full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error || !data) return []

    let likedCommentIds = new Set<string>()
    if (user) {
      const { data: likedData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', data.map((c: any) => c.id))
      likedCommentIds = new Set(likedData?.map((row) => row.comment_id) ?? [])
    }

    return data.map((comment: any) => ({
      ...comment,
      is_liked: likedCommentIds.has(comment.id),
    }))
  },

  async addComment(postId: string, content: string, parentCommentId?: string): Promise<{ comment: PostComment | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { comment: null, error: new Error('인증이 필요합니다') }

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId ?? null,
      })
      .select(`
        id, post_id, user_id, content, parent_comment_id, likes_count, created_at,
        profiles!post_comments_user_id_fkey (full_name, avatar_url)
      `)
      .single()

    if (error || !data) return { comment: null, error }
    return { comment: data as unknown as PostComment, error: null }
  },

  async deleteComment(commentId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('인증이 필요합니다') }

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)

    return { error }
  },

  async explorePublicPosts(limit = 12, offset = 0): Promise<Post[]> {
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || !data) return []

    const likedPostIds = await postsService.getLikedPostIds(data.map((p: any) => p.id))

    return data.map((post: any) => ({
      ...post,
      post_media: (post.post_media ?? []).sort((a: PostMedia, b: PostMedia) => a.order_index - b.order_index),
      is_liked: likedPostIds.has(post.id),
    }))
  },
}
