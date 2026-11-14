import { supabase } from './supabase'

export interface FollowUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  country: string | null
  creator_profiles?: {
    display_name: string | null
    category: string | null
    followers_count: number
  } | null
}

export interface FollowStats {
  followers_count: number
  following_count: number
  is_following: boolean
}

export const followsService = {
  async follow(followingId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('인증이 필요합니다') }

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: followingId })

    return { error }
  },

  async unfollow(followingId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('인증이 필요합니다') }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)

    return { error }
  },

  async isFollowing(followingId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single()

    return !!data
  },

  async getFollowStats(userId: string): Promise<FollowStats> {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('followers_count, following_count')
      .eq('id', userId)
      .single()

    let isFollowing = false
    if (user) {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single()
      isFollowing = !!data
    }

    return {
      followers_count: creatorProfile?.followers_count ?? 0,
      following_count: creatorProfile?.following_count ?? 0,
      is_following: isFollowing,
    }
  },

  async getFollowers(userId: string, limit = 20, offset = 0): Promise<FollowUser[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey (
          id, full_name, avatar_url, country,
          creator_profiles (display_name, category, followers_count)
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || !data) return []

    return data.map((row: any) => row.profiles).filter(Boolean)
  },

  async getFollowing(userId: string, limit = 20, offset = 0): Promise<FollowUser[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        profiles!follows_following_id_fkey (
          id, full_name, avatar_url, country,
          creator_profiles (display_name, category, followers_count)
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || !data) return []

    return data.map((row: any) => row.profiles).filter(Boolean)
  },

  async getFollowingIds(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    return data?.map((row) => row.following_id) ?? []
  },
}
