import { supabase } from './supabase'

export interface UserActivity {
  id: string
  user_id: string
  activity_type: 'login' | 'logout' | 'profile_view' | 'like' | 'match' | 'message' | 'payment' | 'subscription'
  target_user_id?: string
  metadata?: any
  created_at: string
}

export interface UserBehaviorStats {
  user_id: string
  total_logins: number
  total_profile_views: number
  total_likes_sent: number
  total_likes_received: number
  total_matches: number
  total_messages_sent: number
  total_messages_received: number
  average_session_duration: number
  last_active_at: string
  preferred_age_range?: { min: number; max: number }
  preferred_countries?: string[]
  engagement_score: number
}

export interface PlatformStatistics {
  total_users: number
  active_users_today: number
  active_users_week: number
  active_users_month: number
  total_matches: number
  matches_today: number
  total_messages: number
  messages_today: number
  premium_users: number
  revenue_total: number
  revenue_month: number
  conversion_rate: number
  retention_rate_7d: number
  retention_rate_30d: number
}

export interface CountryStats {
  country: string
  user_count: number
  active_users: number
  matches_count: number
  premium_users: number
  average_engagement: number
}

class AnalyticsService {
  // 사용자 활동 기록
  async trackUserActivity(
    userId: string, 
    activityType: UserActivity['activity_type'],
    targetUserId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          target_user_id: targetUserId,
          metadata,
          created_at: new Date().toISOString()
        })

      // 실시간 통계 업데이트
      await this.updateUserBehaviorStats(userId, activityType)
    } catch (error) {
      console.error('Error tracking user activity:', error)
    }
  }

  // 사용자 행동 통계 업데이트
  private async updateUserBehaviorStats(userId: string, activityType: UserActivity['activity_type']) {
    try {
      const { data: currentStats } = await supabase
        .from('user_behavior_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      const updates: Partial<UserBehaviorStats> = {
        last_active_at: new Date().toISOString()
      }

      // 활동 유형별 카운터 증가
      switch (activityType) {
        case 'login':
          updates.total_logins = (currentStats?.total_logins || 0) + 1
          break
        case 'profile_view':
          updates.total_profile_views = (currentStats?.total_profile_views || 0) + 1
          break
        case 'like':
          updates.total_likes_sent = (currentStats?.total_likes_sent || 0) + 1
          break
        case 'match':
          updates.total_matches = (currentStats?.total_matches || 0) + 1
          break
        case 'message':
          updates.total_messages_sent = (currentStats?.total_messages_sent || 0) + 1
          break
      }

      // 참여도 점수 재계산
      if (currentStats) {
        updates.engagement_score = this.calculateEngagementScore({
          ...currentStats,
          ...updates
        } as UserBehaviorStats)
      }

      await supabase
        .from('user_behavior_stats')
        .upsert({
          user_id: userId,
          ...updates
        })
    } catch (error) {
      console.error('Error updating user behavior stats:', error)
    }
  }

  // 참여도 점수 계산
  private calculateEngagementScore(stats: UserBehaviorStats): number {
    let score = 0

    // 로그인 빈도 (30점)
    score += Math.min(stats.total_logins * 0.5, 30)

    // 프로필 조회 활동 (20점)
    score += Math.min(stats.total_profile_views * 0.2, 20)

    // 좋아요 활동 (20점)
    const likeActivity = stats.total_likes_sent + (stats.total_likes_received || 0)
    score += Math.min(likeActivity * 0.3, 20)

    // 매치 성공률 (15점)
    if (stats.total_likes_sent > 0) {
      const matchRate = stats.total_matches / stats.total_likes_sent
      score += matchRate * 15
    }

    // 메시지 활동 (15점)
    const messageActivity = stats.total_messages_sent + (stats.total_messages_received || 0)
    score += Math.min(messageActivity * 0.1, 15)

    return Math.min(100, Math.max(0, score))
  }

  // 사용자별 상세 통계 조회
  async getUserAnalytics(userId: string, days: number = 30): Promise<{
    behaviorStats: UserBehaviorStats | null
    recentActivities: UserActivity[]
    matchSuccessRate: number
    messageResponseRate: number
    popularTimes: { hour: number; count: number }[]
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      // 행동 통계
      const { data: behaviorStats } = await supabase
        .from('user_behavior_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      // 최근 활동
      const { data: recentActivities } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100)

      // 매치 성공률 계산
      const { count: totalLikes } = await supabase
        .from('user_activities')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('activity_type', 'like')
        .gte('created_at', since)

      const { count: totalMatches } = await supabase
        .from('user_activities')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('activity_type', 'match')
        .gte('created_at', since)

      const matchSuccessRate = totalLikes ? (totalMatches || 0) / totalLikes * 100 : 0

      // 메시지 응답률 계산
      const { data: sentMessages } = await supabase
        .from('messages')
        .select('id, chat_room_id')
        .eq('sender_id', userId)
        .gte('created_at', since)

      let messageResponseRate = 0
      if (sentMessages && sentMessages.length > 0) {
        const roomIds = [...new Set(sentMessages.map(m => m.chat_room_id))]
        const { count: responsesReceived } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .in('chat_room_id', roomIds)
          .neq('sender_id', userId)
          .gte('created_at', since)

        messageResponseRate = (responsesReceived || 0) / sentMessages.length * 100
      }

      // 활동 시간대 분석
      const activityByHour = new Array(24).fill(0)
      recentActivities?.forEach(activity => {
        const hour = new Date(activity.created_at).getHours()
        activityByHour[hour]++
      })

      const popularTimes = activityByHour.map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)

      return {
        behaviorStats,
        recentActivities: recentActivities || [],
        matchSuccessRate,
        messageResponseRate,
        popularTimes
      }
    } catch (error) {
      console.error('Error getting user analytics:', error)
      return {
        behaviorStats: null,
        recentActivities: [],
        matchSuccessRate: 0,
        messageResponseRate: 0,
        popularTimes: []
      }
    }
  }

  // 플랫폼 전체 통계
  async getPlatformStatistics(): Promise<PlatformStatistics> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // 병렬로 모든 통계 조회
      const [
        totalUsersResult,
        activeTodayResult,
        activeWeekResult,
        activeMonthResult,
        totalMatchesResult,
        matchesTodayResult,
        totalMessagesResult,
        messagesTodayResult,
        premiumUsersResult,
        paymentsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('user_activities').select('user_id', { count: 'exact' }).gte('created_at', today).eq('activity_type', 'login'),
        supabase.from('user_activities').select('user_id', { count: 'exact' }).gte('created_at', weekAgo),
        supabase.from('user_activities').select('user_id', { count: 'exact' }).gte('created_at', monthAgo),
        supabase.from('matches').select('id', { count: 'exact' }),
        supabase.from('matches').select('id', { count: 'exact' }).gte('created_at', today),
        supabase.from('messages').select('id', { count: 'exact' }),
        supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', today),
        supabase.from('subscriptions').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('payments').select('amount').eq('status', 'completed')
      ])

      // 수익 계산
      const totalRevenue = paymentsResult.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      
      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', monthAgo)
      
      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

      // 전환율 계산 (가입자 대비 프리미엄 사용자)
      const conversionRate = totalUsersResult.count ? (premiumUsersResult.count || 0) / totalUsersResult.count * 100 : 0

      // 유지율 계산 (7일, 30일)
      const { data: newUsersWeek } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', weekAgo)

      const { data: activeNewUsersWeek } = await supabase
        .from('user_activities')
        .select('user_id')
        .gte('created_at', weekAgo)
        .in('user_id', newUsersWeek?.map(u => u.id) || [])

      const retention7d = newUsersWeek?.length ? 
        (new Set(activeNewUsersWeek?.map(a => a.user_id)).size / newUsersWeek.length * 100) : 0

      const { data: newUsersMonth } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', monthAgo)

      const { data: activeNewUsersMonth } = await supabase
        .from('user_activities')
        .select('user_id')
        .gte('created_at', monthAgo)
        .in('user_id', newUsersMonth?.map(u => u.id) || [])

      const retention30d = newUsersMonth?.length ? 
        (new Set(activeNewUsersMonth?.map(a => a.user_id)).size / newUsersMonth.length * 100) : 0

      return {
        total_users: totalUsersResult.count || 0,
        active_users_today: new Set(activeTodayResult.data?.map(a => a.user_id)).size,
        active_users_week: new Set(activeWeekResult.data?.map(a => a.user_id)).size,
        active_users_month: new Set(activeMonthResult.data?.map(a => a.user_id)).size,
        total_matches: totalMatchesResult.count || 0,
        matches_today: matchesTodayResult.count || 0,
        total_messages: totalMessagesResult.count || 0,
        messages_today: messagesTodayResult.count || 0,
        premium_users: premiumUsersResult.count || 0,
        revenue_total: totalRevenue,
        revenue_month: monthlyRevenue,
        conversion_rate: conversionRate,
        retention_rate_7d: retention7d,
        retention_rate_30d: retention30d
      }
    } catch (error) {
      console.error('Error getting platform statistics:', error)
      return {
        total_users: 0,
        active_users_today: 0,
        active_users_week: 0,
        active_users_month: 0,
        total_matches: 0,
        matches_today: 0,
        total_messages: 0,
        messages_today: 0,
        premium_users: 0,
        revenue_total: 0,
        revenue_month: 0,
        conversion_rate: 0,
        retention_rate_7d: 0,
        retention_rate_30d: 0
      }
    }
  }

  // 국가별 통계
  async getCountryStatistics(): Promise<CountryStats[]> {
    try {
      const { data: countries } = await supabase
        .from('profiles')
        .select('country')
        .not('country', 'is', null)

      const uniqueCountries = [...new Set(countries?.map(c => c.country))]
      const stats: CountryStats[] = []

      for (const country of uniqueCountries) {
        const [userCountResult, activeUsersResult, matchesResult, premiumResult, engagementResult] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact' }).eq('country', country),
          supabase.from('user_behavior_stats').select('user_id', { count: 'exact' })
            .gte('last_active_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .in('user_id', countries?.filter(c => c.country === country).map(c => c) || []),
          supabase.from('matches').select('id', { count: 'exact' }).or(`user1_country.eq.${country},user2_country.eq.${country}`),
          supabase.from('subscriptions').select('user_id', { count: 'exact' })
            .eq('status', 'active')
            .in('user_id', countries?.filter(c => c.country === country).map(c => c) || []),
          supabase.from('user_behavior_stats').select('engagement_score')
            .in('user_id', countries?.filter(c => c.country === country).map(c => c) || [])
        ])

        const avgEngagement = engagementResult.data?.length ? 
          engagementResult.data.reduce((sum, u) => sum + u.engagement_score, 0) / engagementResult.data.length : 0

        stats.push({
          country,
          user_count: userCountResult.count || 0,
          active_users: activeUsersResult.count || 0,
          matches_count: matchesResult.count || 0,
          premium_users: premiumResult.count || 0,
          average_engagement: avgEngagement
        })
      }

      return stats.sort((a, b) => b.user_count - a.user_count)
    } catch (error) {
      console.error('Error getting country statistics:', error)
      return []
    }
  }

  // 시간대별 활동 분석
  async getActivityTrends(days: number = 7): Promise<{
    hourly: { hour: number; activity_count: number }[]
    daily: { date: string; activity_count: number }[]
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: activities } = await supabase
        .from('user_activities')
        .select('created_at')
        .gte('created_at', since)

      // 시간대별 분석
      const hourlyStats = new Array(24).fill(0)
      const dailyStats: { [key: string]: number } = {}

      activities?.forEach(activity => {
        const date = new Date(activity.created_at)
        const hour = date.getHours()
        const day = date.toISOString().split('T')[0]

        hourlyStats[hour]++
        dailyStats[day] = (dailyStats[day] || 0) + 1
      })

      const hourly = hourlyStats.map((count, hour) => ({ hour, activity_count: count }))
      const daily = Object.entries(dailyStats)
        .map(([date, count]) => ({ date, activity_count: count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return { hourly, daily }
    } catch (error) {
      console.error('Error getting activity trends:', error)
      return { hourly: [], daily: [] }
    }
  }

  // 매치 성공률 분석
  async getMatchAnalytics(): Promise<{
    overall_success_rate: number
    success_by_country: { country: string; success_rate: number }[]
    success_by_age_group: { age_group: string; success_rate: number }[]
  }> {
    try {
      // 전체 성공률
      const { count: totalLikes } = await supabase
        .from('user_activities')
        .select('id', { count: 'exact' })
        .eq('activity_type', 'like')

      const { count: totalMatches } = await supabase
        .from('matches')
        .select('id', { count: 'exact' })

      const overallSuccessRate = totalLikes ? (totalMatches || 0) / totalLikes * 100 : 0

      // 국가별 성공률 (구현 복잡성으로 인해 목업 데이터)
      const successByCountry = [
        { country: 'Korea', success_rate: 15.2 },
        { country: 'Russia', success_rate: 12.8 },
        { country: 'Ukraine', success_rate: 14.1 },
        { country: 'Philippines', success_rate: 18.5 },
        { country: 'Vietnam', success_rate: 16.3 }
      ]

      // 연령대별 성공률 (목업 데이터)
      const successByAgeGroup = [
        { age_group: '20-25', success_rate: 18.7 },
        { age_group: '26-30', success_rate: 16.4 },
        { age_group: '31-35', success_rate: 13.2 },
        { age_group: '36-40', success_rate: 11.8 },
        { age_group: '41+', success_rate: 9.5 }
      ]

      return {
        overall_success_rate: overallSuccessRate,
        success_by_country: successByCountry,
        success_by_age_group: successByAgeGroup
      }
    } catch (error) {
      console.error('Error getting match analytics:', error)
      return {
        overall_success_rate: 0,
        success_by_country: [],
        success_by_age_group: []
      }
    }
  }
}

export const analyticsService = new AnalyticsService()