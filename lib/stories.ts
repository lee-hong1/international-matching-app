import { supabase } from './supabase'

export interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string | null
  bg_color: string
  views_count: number
  expires_at: string
  created_at: string
  is_viewed?: boolean
}

export interface StoryGroup {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
    creator_profiles?: { display_name: string | null } | null
  }
  stories: Story[]
  has_unviewed: boolean
}

export const storiesService = {
  async getFeedStories(): Promise<StoryGroup[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = followingData?.map((f) => f.following_id) ?? []
    const storyUserIds = [user.id, ...followingIds]

    const { data: storiesData, error } = await supabase
      .from('stories')
      .select(`
        id, user_id, media_url, media_type, caption, bg_color, views_count, expires_at, created_at,
        profiles!stories_user_id_fkey (id, full_name, avatar_url,
          creator_profiles (display_name)
        )
      `)
      .in('user_id', storyUserIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error || !storiesData) return []

    const viewedStoryIds = await storiesService.getViewedStoryIds(storiesData.map((s: any) => s.id))

    const userMap = new Map<string, StoryGroup>()

    for (const story of storiesData as any[]) {
      const userId = story.user_id
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user: story.profiles,
          stories: [],
          has_unviewed: false,
        })
      }

      const storyWithViewed = {
        ...story,
        is_viewed: viewedStoryIds.has(story.id),
      }

      const group = userMap.get(userId)!
      group.stories.push(storyWithViewed)
      if (!storyWithViewed.is_viewed) {
        group.has_unviewed = true
      }
    }

    // 본인 스토리를 맨 앞에
    const groups = Array.from(userMap.values())
    return groups.sort((a, b) => {
      if (a.user.id === user.id) return -1
      if (b.user.id === user.id) return 1
      if (a.has_unviewed && !b.has_unviewed) return -1
      if (!a.has_unviewed && b.has_unviewed) return 1
      return 0
    })
  },

  async getUserStories(userId: string): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, caption, bg_color, views_count, expires_at, created_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })

    if (error || !data) return []

    const viewedStoryIds = await storiesService.getViewedStoryIds(data.map((s) => s.id))

    return data.map((story) => ({
      ...story,
      is_viewed: viewedStoryIds.has(story.id),
    })) as Story[]
  },

  async createStory(file: File, caption?: string, bgColor?: string): Promise<{ story: Story | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { story: null, error: new Error('인증이 필요합니다') }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(fileName, file)

    if (uploadError) return { story: null, error: uploadError }

    const { data: { publicUrl } } = supabase.storage
      .from('stories')
      .getPublicUrl(fileName)

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: file.type.startsWith('video/') ? 'video' : 'image',
        caption: caption ?? null,
        bg_color: bgColor ?? '#000000',
      })
      .select()
      .single()

    if (error || !data) return { story: null, error }
    return { story: data as Story, error: null }
  },

  async deleteStory(storyId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('인증이 필요합니다') }

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', user.id)

    return { error }
  },

  async markStoryViewed(storyId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('story_views')
      .upsert({ story_id: storyId, viewer_id: user.id }, { onConflict: 'story_id,viewer_id' })
  },

  async getViewedStoryIds(storyIds: string[]): Promise<Set<string>> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || storyIds.length === 0) return new Set()

    const { data } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', user.id)
      .in('story_id', storyIds)

    return new Set(data?.map((row) => row.story_id) ?? [])
  },

  async getStoryViewers(storyId: string): Promise<{ id: string; full_name: string | null; avatar_url: string | null; viewed_at: string }[]> {
    const { data, error } = await supabase
      .from('story_views')
      .select(`
        viewed_at,
        profiles!story_views_viewer_id_fkey (id, full_name, avatar_url)
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false })

    if (error || !data) return []

    return data.map((row: any) => ({
      ...row.profiles,
      viewed_at: row.viewed_at,
    }))
  },
}
