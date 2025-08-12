import { supabase } from './supabase'

export interface AdminStats {
  totalUsers: number
  verifiedUsers: number
  premiumUsers: number
  totalMatches: number
  totalMessages: number
  dailyActiveUsers: number
  revenue: number
  pendingReports: number
}

export interface UserManagement {
  id: string
  email: string
  full_name: string
  country: string
  gender: string
  verification_status: string
  is_premium: boolean
  created_at: string
  last_active: string
  total_matches: number
  total_messages: number
}

export interface ReportManagement {
  id: string
  reporter: {
    id: string
    full_name: string
    email: string
  }
  reported: {
    id: string
    full_name: string
    email: string
  }
  reason: string
  description: string
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
}

export const adminService = {
  // 관리자 권한 확인
  async checkAdminRole(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return false
    }

    // 관리자 이메일 목록 (환경 변수로 관리)
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    return adminEmails.includes(data.email)
  },

  // 대시보드 통계 가져오기
  async getDashboardStats(): Promise<AdminStats> {
    try {
      // 병렬로 모든 통계 쿼리 실행
      const [
        totalUsersQuery,
        verifiedUsersQuery,
        premiumUsersQuery,
        totalMatchesQuery,
        totalMessagesQuery,
        dailyActiveUsersQuery,
        revenueQuery,
        pendingReportsQuery
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .gte('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('payments').select('amount').eq('payment_status', 'completed'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      ])

      // 수익 계산
      const totalRevenue = revenueQuery.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0

      return {
        totalUsers: totalUsersQuery.count || 0,
        verifiedUsers: verifiedUsersQuery.count || 0,
        premiumUsers: premiumUsersQuery.count || 0,
        totalMatches: totalMatchesQuery.count || 0,
        totalMessages: totalMessagesQuery.count || 0,
        dailyActiveUsers: dailyActiveUsersQuery.count || 0,
        revenue: totalRevenue,
        pendingReports: pendingReportsQuery.count || 0
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  },

  // 사용자 목록 가져오기
  async getUsers(page: number = 1, limit: number = 20, filters?: {
    search?: string
    verificationStatus?: string
    isPremium?: boolean
    country?: string
  }): Promise<{ users: UserManagement[]; total: number }> {
    let query = supabase
      .from('profiles')
      .select(`
        id, email, full_name, country, gender, verification_status, 
        is_premium, created_at, last_active
      `)

    // 필터 적용
    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }
    if (filters?.verificationStatus) {
      query = query.eq('verification_status', filters.verificationStatus)
    }
    if (filters?.isPremium !== undefined) {
      query = query.eq('is_premium', filters.isPremium)
    }
    if (filters?.country) {
      query = query.eq('country', filters.country)
    }

    // 페이지네이션
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }

    // 각 사용자의 매칭 및 메시지 통계 가져오기
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const [matchesQuery, messagesQuery] = await Promise.all([
          supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', user.id)
        ])

        return {
          ...user,
          total_matches: matchesQuery.count || 0,
          total_messages: messagesQuery.count || 0
        }
      })
    )

    return {
      users: usersWithStats,
      total: count || 0
    }
  },

  // 신고 목록 가져오기
  async getReports(page: number = 1, limit: number = 20, status?: string): Promise<{ reports: ReportManagement[]; total: number }> {
    let query = supabase
      .from('reports')
      .select(`
        id, reason, description, status, created_at, resolved_at,
        reporter:profiles!reports_reporter_id_fkey(id, full_name, email),
        reported:profiles!reports_reported_id_fkey(id, full_name, email)
      `)

    if (status) {
      query = query.eq('status', status)
    }

    const from = (page - 1) * limit
    const { data: reports, error, count } = await query
      .range(from, from + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      throw error
    }

    return {
      reports: reports || [],
      total: count || 0
    }
  },

  // 신고 처리
  async handleReport(reportId: string, action: 'resolve' | 'dismiss', adminNote?: string) {
    const { data, error } = await supabase
      .from('reports')
      .update({
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        resolved_at: new Date().toISOString(),
        ...(adminNote && { admin_note: adminNote })
      })
      .eq('id', reportId)
      .select()

    if (error) {
      console.error('Error handling report:', error)
      throw error
    }

    return data
  },

  // 사용자 인증 상태 변경
  async updateUserVerification(userId: string, status: 'verified' | 'rejected') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ verification_status: status })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Error updating verification status:', error)
      throw error
    }

    return data
  },

  // 사용자 계정 정지/활성화
  async suspendUser(userId: string, suspend: boolean, reason?: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        is_suspended: suspend,
        suspension_reason: suspend ? reason : null,
        suspended_at: suspend ? new Date().toISOString() : null
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Error updating suspension status:', error)
      throw error
    }

    return data
  },

  // 월별 통계 가져오기
  async getMonthlyStats(months: number = 12) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - months)

    try {
      const [usersQuery, matchesQuery, revenueQuery] = await Promise.all([
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('matches')
          .select('created_at')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('payments')
          .select('amount, created_at')
          .eq('payment_status', 'completed')
          .gte('created_at', startDate.toISOString())
      ])

      // 월별 데이터 집계
      const monthlyData = []
      for (let i = 0; i < months; i++) {
        const monthStart = new Date()
        monthStart.setMonth(endDate.getMonth() - i)
        monthStart.setDate(1)
        
        const monthEnd = new Date(monthStart)
        monthEnd.setMonth(monthStart.getMonth() + 1)
        
        const monthUsers = usersQuery.data?.filter(u => {
          const date = new Date(u.created_at)
          return date >= monthStart && date < monthEnd
        }).length || 0

        const monthMatches = matchesQuery.data?.filter(m => {
          const date = new Date(m.created_at)
          return date >= monthStart && date < monthEnd
        }).length || 0

        const monthRevenue = revenueQuery.data?.filter(p => {
          const date = new Date(p.created_at)
          return date >= monthStart && date < monthEnd
        }).reduce((sum, p) => sum + p.amount, 0) || 0

        monthlyData.unshift({
          month: monthStart.toISOString().slice(0, 7), // YYYY-MM
          users: monthUsers,
          matches: monthMatches,
          revenue: monthRevenue
        })
      }

      return monthlyData
    } catch (error) {
      console.error('Error fetching monthly stats:', error)
      throw error
    }
  },

  // 국가별 통계
  async getCountryStats() {
    const { data, error } = await supabase
      .from('profiles')
      .select('country')

    if (error) {
      console.error('Error fetching country stats:', error)
      throw error
    }

    // 국가별 집계
    const countryStats = data?.reduce((acc, profile) => {
      const country = profile.country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return Object.entries(countryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
  }
}