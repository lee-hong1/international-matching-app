import { getAuthHeaders } from '@src/lib/auth-token'

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
  async checkAdminRole(_userId: string): Promise<boolean> {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/check-role', {
        credentials: 'include',
        headers: authHeaders,
      })
      if (!res.ok) return false
      const data = await res.json()
      return Boolean(data.isAdmin)
    } catch {
      return false
    }
  },

  async getDashboardStats(): Promise<AdminStats> {
    const authHeaders = await getAuthHeaders()
    const res = await fetch('/api/admin/stats', {
      credentials: 'include',
      headers: authHeaders,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to fetch stats')
    }
    return res.json()
  },

  async getUsers(page: number = 1, limit: number = 20, filters?: {
    search?: string
    verificationStatus?: string
    isPremium?: boolean
    country?: string
  }): Promise<{ users: UserManagement[]; total: number }> {
    const authHeaders = await getAuthHeaders()
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filters?.search) params.set('search', filters.search)
    if (filters?.verificationStatus) params.set('verificationStatus', filters.verificationStatus)
    if (filters?.isPremium !== undefined) params.set('isPremium', String(filters.isPremium))
    if (filters?.country) params.set('country', filters.country)

    const res = await fetch(`/api/admin/users-list?${params}`, {
      credentials: 'include',
      headers: authHeaders,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to fetch users')
    }
    return res.json()
  },

  async getReports(page: number = 1, limit: number = 20, status?: string): Promise<{ reports: ReportManagement[]; total: number }> {
    const authHeaders = await getAuthHeaders()
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) params.set('status', status)

    const res = await fetch(`/api/admin/reports-list?${params}`, {
      credentials: 'include',
      headers: authHeaders,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to fetch reports')
    }
    return res.json()
  },

  async handleReport(reportId: string, action: 'resolve' | 'dismiss', adminNote?: string) {
    const authHeaders = await getAuthHeaders()
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ action, admin_note: adminNote }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to handle report')
    }
    return res.json()
  },

  async updateUserVerification(userId: string, status: 'verified' | 'rejected') {
    const authHeaders = await getAuthHeaders()
    const res = await fetch(`/api/admin/profiles/${userId}/verify`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to update verification status')
    }
    return res.json()
  },

  async suspendUser(userId: string, suspend: boolean, reason?: string) {
    const authHeaders = await getAuthHeaders()
    const res = await fetch(`/api/admin/profiles/${userId}/suspend`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ action: suspend ? 'suspend' : 'unsuspend', reason }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to update suspension status')
    }
    return res.json()
  },

  async getMonthlyStats(months: number = 12) {
    const authHeaders = await getAuthHeaders()
    const res = await fetch(`/api/admin/monthly-stats?months=${months}`, {
      credentials: 'include',
      headers: authHeaders,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to fetch monthly stats')
    }
    return res.json()
  },

  async getCountryStats() {
    const authHeaders = await getAuthHeaders()
    const res = await fetch('/api/admin/country-stats', {
      credentials: 'include',
      headers: authHeaders,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to fetch country stats')
    }
    return res.json()
  },
}
