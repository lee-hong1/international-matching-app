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
    } as unknown as Post
  },

  async createPost(postData: CreatePostData): Promise<{ post: Post | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { post: null, error: new Error('인증이 필요합니다') }

    // MIME 타입 → 허용 확장자 (파일명에서 추출하지 않음 — 위장 실행파일 방지)
    const ALLOWED_TYPES: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
      'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    }
    const MAX_IMAGE_BYTES = 20 * 1024 * 1024
    const MAX_VIDEO_BYTES = 200 * 1024 * 1024

    for (const file of postData.mediaFiles) {
      if (!(file.type in ALLOWED_TYPES)) {
        return { post: null, error: new Error(`지원하지 않는 파일 형식: ${file.type}`) }
      }
      const limit = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
      if (file.size > limit) {
        return { post: null, error: new Error(`파일 크기 초과 (최대 ${Math.round(limit / 1024 / 1024)}MB): ${file.name}`) }
      }
    }

    // 1. 파일을 먼저 업로드 (post 행 삽입 전) — orphan post 방지
    //    업로드 실패 시 성공한 파일을 롤백하고 에러 반환
    const uploadBase = `${user.id}/${Date.now()}`
    const uploadResults = await Promise.all(
      postData.mediaFiles.map(async (file, i) => {
        const ext = ALLOWED_TYPES[file.type]
        const filePath = `${uploadBase}-${i}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(filePath, file, { contentType: file.type, upsert: false })
        if (uploadError) return { filePath, publicUrl: null, error: uploadError, file }
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filePath)
        return { filePath, publicUrl, error: null, file }
      })
    )

    const failed = uploadResults.filter((r) => r.error)
    if (failed.length > 0) {
      const successPaths = uploadResults.filter((r) => !r.error).map((r) => r.filePath)
      if (successPaths.length > 0) {
        await supabase.storage.from('post-media').remove(successPaths)
      }
      return { post: null, error: failed[0].error }
    }

    // 2. 모든 파일 업로드 성공 후 post 행 삽입
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

    if (postError || !post) {
      // post 삽입 실패 시 업로드한 파일 전부 롤백
      await supabase.storage.from('post-media').remove(uploadResults.map((r) => r.filePath))
      return { post: null, error: postError }
    }

    // 3. post_media 행 삽입
    const mediaInserts = uploadResults.map((r, i) => ({
      post_id: post.id,
      media_url: r.publicUrl!,
      media_type: r.file.type.startsWith('video/') ? 'video' : 'image',
      order_index: i,
    }))

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
