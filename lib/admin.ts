import { supabaseService } from '@src/lib/commerce'

export interface AdminStats {
  totalUsers: number
  verifiedUsers: number
  premiumUsers: number
  totalMatches: number
  totalMessages: number
  dailyActiveUsers: number
  dailySignups: number
  revenue: number
  avgOrderValue: number
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
  // 관리자 권한 확인 — 서버사이드 API 호출 (ADMIN_EMAILS env var 클라이언트 노출 방지)
  async checkAdminRole(_userId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/check-role', { credentials: 'include' })
      if (!res.ok) return false
      const data = await res.json()
      return Boolean(data.isAdmin)
    } catch {
      return false
    }
  },

  // 대시보드 통계 가져오기
  async getDashboardStats(): Promise<AdminStats> {
    try {
      // 병렬로 모든 통계 쿼리 실행
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [
        totalUsersQuery,
        verifiedUsersQuery,
        premiumUsersQuery,
        totalMatchesQuery,
        totalMessagesQuery,
        dailyActiveUsersQuery,
        dailySignupsQuery,
        revenueQuery,
        pendingReportsQuery
      ] = await Promise.all([
        supabaseService.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseService.from('profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabaseService.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
        supabaseService.from('matches').select('id', { count: 'exact', head: true }),
        supabaseService.from('messages').select('id', { count: 'exact', head: true }),
        supabaseService.from('profiles').select('id', { count: 'exact', head: true })
          .gte('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabaseService.from('profiles').select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString()),
        supabaseService.from('payments').select('amount').eq('payment_status', 'completed'),
        supabaseService.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      ])

      // Revenue and AOV calculation
      const payments = revenueQuery.data ?? []
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
      const avgOrderValue = payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0

      return {
        totalUsers: totalUsersQuery.count || 0,
        verifiedUsers: verifiedUsersQuery.count || 0,
        premiumUsers: premiumUsersQuery.count || 0,
        totalMatches: totalMatchesQuery.count || 0,
        totalMessages: totalMessagesQuery.count || 0,
        dailyActiveUsers: dailyActiveUsersQuery.count || 0,
        dailySignups: dailySignupsQuery.count || 0,
        revenue: totalRevenue,
        avgOrderValue,
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
    let query = supabaseService
      .from('profiles')
      .select(`
        id, email, full_name, country, gender, verification_status,
        is_premium, created_at, last_active
      `)

    // 필터 적용 — search 값의 PostgREST .or() 특수문자 제거 (filter injection 방지)
    if (filters?.search) {
      const safeSearch = filters.search.replace(/[,()]/g, '').slice(0, 100)
      if (safeSearch) {
        query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`)
      }
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

    // N+1 방지: 페이지 사용자 전체 통계를 2개 쿼리로 일괄 조회
    const userIds = (users || []).map((u) => u.id)
    const [matchesData, messagesData] = await Promise.all([
      userIds.length > 0
        ? supabaseService
            .from('matches')
            .select('user1_id, user2_id')
            .or(userIds.flatMap((id) => [`user1_id.eq.${id}`, `user2_id.eq.${id}`]).join(','))
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabaseService
            .from('messages')
            .select('sender_id')
            .in('sender_id', userIds)
        : Promise.resolve({ data: [] }),
    ])

    const matchCounts: Record<string, number> = {}
    const messageCounts: Record<string, number> = {}
    ;(matchesData.data ?? []).forEach((m: { user1_id: string; user2_id: string }) => {
      matchCounts[m.user1_id] = (matchCounts[m.user1_id] ?? 0) + 1
      matchCounts[m.user2_id] = (matchCounts[m.user2_id] ?? 0) + 1
    })
    ;(messagesData.data ?? []).forEach((m: { sender_id: string }) => {
      messageCounts[m.sender_id] = (messageCounts[m.sender_id] ?? 0) + 1
    })

    const usersWithStats = (users || []).map((user) => ({
      ...user,
      total_matches: matchCounts[user.id] ?? 0,
      total_messages: messageCounts[user.id] ?? 0,
    }))

    return {
      users: usersWithStats,
      total: count || 0
    }
  },

  // 신고 목록 가져오기
  async getReports(page: number = 1, limit: number = 20, status?: string): Promise<{ reports: ReportManagement[]; total: number }> {
    let query = supabaseService
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
      reports: (reports || []) as unknown as ReportManagement[],
      total: count || 0
    }
  },

  // 신고 처리 — 서버사이드 API 경유 (anon client RLS 우회 위험 방지)
  async handleReport(reportId: string, action: 'resolve' | 'dismiss', adminNote?: string) {
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, admin_note: adminNote }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to handle report')
    }
    return res.json()
  },

  // 사용자 인증 상태 변경 — 서버사이드 RLS 우회 위험 방지: 직접 DB 쓰기 대신 API 호출
  async updateUserVerification(userId: string, status: 'verified' | 'rejected') {
    const res = await fetch(`/api/admin/profiles/${userId}/verify`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to update verification status')
    }
    return res.json()
  },

  // 사용자 계정 정지/활성화 — supabase service role 보장: /api/admin/profiles/:id/suspend 경유
  async suspendUser(userId: string, suspend: boolean, reason?: string) {
    const res = await fetch(`/api/admin/profiles/${userId}/suspend`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: suspend ? 'suspend' : 'unsuspend', reason }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to update suspension status')
    }
    return res.json()
  },

  // 월별 통계 가져오기
  async getMonthlyStats(months: number = 12) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - months)

    try {
      const [usersQuery, matchesQuery, revenueQuery] = await Promise.all([
        supabaseService
          .from('profiles')
          .select('created_at')
          .gte('created_at', startDate.toISOString()),
        supabaseService
          .from('matches')
          .select('created_at')
          .gte('created_at', startDate.toISOString()),
        supabaseService
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
    const { data, error } = await supabaseService
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