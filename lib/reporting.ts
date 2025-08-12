import { supabase } from './supabase'
import { notificationService } from './notifications'

export interface ReportData {
  id: string
  reporter_id: string
  reported_user_id: string
  reported_content_id?: string
  report_type: 'inappropriate_content' | 'harassment' | 'fake_profile' | 'spam' | 'abuse' | 'other'
  category: 'profile' | 'message' | 'photo' | 'behavior'
  description: string
  evidence?: string[]
  status: 'pending' | 'investigating' | 'resolved' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  updated_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
}

export interface BlockData {
  id: string
  blocker_id: string
  blocked_user_id: string
  reason: string
  created_at: string
  is_mutual: boolean
}

export interface SafetyAction {
  id: string
  user_id: string
  action_type: 'warning' | 'temporary_ban' | 'permanent_ban' | 'profile_review' | 'content_removal'
  reason: string
  duration?: number // hours for temporary ban
  applied_by: string
  applied_at: string
  notes?: string
}

class ReportingService {
  // 신고 생성
  async createReport(reportData: Omit<ReportData, 'id' | 'created_at' | 'updated_at' | 'status' | 'priority'>): Promise<ReportData | null> {
    try {
      // 우선순위 자동 계산
      const priority = this.calculateReportPriority(reportData)
      
      const { data, error } = await supabase
        .from('reports')
        .insert({
          ...reportData,
          status: 'pending',
          priority,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating report:', error)
        return null
      }

      // 관리자에게 알림
      await this.notifyAdminsOfNewReport(data)
      
      // 신고당한 사용자의 신고 이력 확인 및 자동 조치
      await this.checkForAutomaticActions(reportData.reported_user_id, reportData.report_type)

      return data
    } catch (error) {
      console.error('Error creating report:', error)
      return null
    }
  }

  // 신고 우선순위 계산
  private calculateReportPriority(reportData: Partial<ReportData>): 'low' | 'medium' | 'high' | 'critical' {
    // 위험한 신고 유형
    const criticalTypes = ['abuse', 'harassment']
    const highPriorityTypes = ['inappropriate_content', 'fake_profile']
    
    if (criticalTypes.includes(reportData.report_type!)) {
      return 'critical'
    }
    
    if (highPriorityTypes.includes(reportData.report_type!)) {
      return 'high'
    }
    
    return 'medium'
  }

  // 사용자 차단
  async blockUser(blockerId: string, blockedUserId: string, reason: string): Promise<boolean> {
    try {
      // 기존 차단 확인
      const { data: existingBlock } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', blockerId)
        .eq('blocked_user_id', blockedUserId)
        .single()

      if (existingBlock) {
        return false // 이미 차단됨
      }

      // 상호 차단 여부 확인
      const { data: reverseBlock } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', blockedUserId)
        .eq('blocked_user_id', blockerId)
        .single()

      const isMutual = !!reverseBlock

      // 차단 생성
      const { error } = await supabase
        .from('blocks')
        .insert({
          blocker_id: blockerId,
          blocked_user_id: blockedUserId,
          reason,
          is_mutual: isMutual,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error creating block:', error)
        return false
      }

      // 상호 차단인 경우 업데이트
      if (reverseBlock) {
        await supabase
          .from('blocks')
          .update({ is_mutual: true })
          .eq('id', reverseBlock.id)
      }

      // 기존 매치 및 채팅 비활성화
      await this.deactivateUserInteractions(blockerId, blockedUserId)

      return true
    } catch (error) {
      console.error('Error blocking user:', error)
      return false
    }
  }

  // 사용자 차단 해제
  async unblockUser(blockerId: string, blockedUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_user_id', blockedUserId)

      if (error) {
        console.error('Error unblocking user:', error)
        return false
      }

      // 상대방이 나를 차단했는지 확인하고 상호 차단 상태 업데이트
      const { data: reverseBlock } = await supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', blockedUserId)
        .eq('blocked_user_id', blockerId)
        .single()

      if (reverseBlock) {
        await supabase
          .from('blocks')
          .update({ is_mutual: false })
          .eq('id', reverseBlock.id)
      }

      return true
    } catch (error) {
      console.error('Error unblocking user:', error)
      return false
    }
  }

  // 차단된 사용자 목록
  async getBlockedUsers(userId: string, page: number = 1, limit: number = 20) {
    try {
      const from = (page - 1) * limit
      const { data, error, count } = await supabase
        .from('blocks')
        .select(`
          *,
          blocked_user:profiles!blocks_blocked_user_id_fkey (
            id,
            full_name,
            avatar_url,
            country
          )
        `, { count: 'exact' })
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1)

      if (error) {
        console.error('Error fetching blocked users:', error)
        return { blocks: [], total: 0 }
      }

      return { blocks: data || [], total: count || 0 }
    } catch (error) {
      console.error('Error fetching blocked users:', error)
      return { blocks: [], total: 0 }
    }
  }

  // 사용자가 차단되었는지 확인
  async isUserBlocked(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('blocks')
        .select('id')
        .or(`and(blocker_id.eq.${userId1},blocked_user_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_user_id.eq.${userId1})`)
        .limit(1)

      return (data?.length || 0) > 0
    } catch (error) {
      console.error('Error checking block status:', error)
      return false
    }
  }

  // 신고 처리 (관리자용)
  async processReport(reportId: string, status: ReportData['status'], resolutionNotes: string, adminId: string) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update({
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
          resolved_by: status === 'resolved' ? adminId : null,
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single()

      if (error) {
        console.error('Error processing report:', error)
        return false
      }

      // 신고자에게 처리 결과 알림
      if (status === 'resolved') {
        await notificationService.createNotification({
          user_id: data.reporter_id,
          type: 'system',
          title: '신고 처리 완료',
          body: '신고해주신 내용이 처리되었습니다.',
          is_read: false
        })
      }

      return true
    } catch (error) {
      console.error('Error processing report:', error)
      return false
    }
  }

  // 자동 조치 확인
  private async checkForAutomaticActions(userId: string, reportType: ReportData['report_type']) {
    try {
      // 최근 30일간 같은 사용자에 대한 신고 수 확인
      const { data: recentReports, count } = await supabase
        .from('reports')
        .select('id', { count: 'exact' })
        .eq('reported_user_id', userId)
        .eq('report_type', reportType)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const reportCount = count || 0

      // 자동 조치 규칙
      if (reportCount >= 5 && reportType === 'harassment') {
        // 괴롭힘 신고 5회 이상: 임시 정지
        await this.applySafetyAction(userId, {
          action_type: 'temporary_ban',
          reason: '반복적인 괴롭힘 신고로 인한 자동 조치',
          duration: 72, // 3일
          applied_by: 'system'
        })
      } else if (reportCount >= 3 && reportType === 'inappropriate_content') {
        // 부적절한 콘텐츠 신고 3회 이상: 프로필 검토
        await this.applySafetyAction(userId, {
          action_type: 'profile_review',
          reason: '반복적인 부적절한 콘텐츠 신고로 인한 프로필 검토',
          applied_by: 'system'
        })
      } else if (reportCount >= 10) {
        // 어떤 유형이든 10회 이상: 영구 정지
        await this.applySafetyAction(userId, {
          action_type: 'permanent_ban',
          reason: '반복적인 신고로 인한 영구 정지',
          applied_by: 'system'
        })
      }
    } catch (error) {
      console.error('Error checking automatic actions:', error)
    }
  }

  // 안전 조치 적용
  async applySafetyAction(userId: string, actionData: Omit<SafetyAction, 'id' | 'user_id' | 'applied_at'>) {
    try {
      // 안전 조치 기록
      const { error: actionError } = await supabase
        .from('safety_actions')
        .insert({
          user_id: userId,
          ...actionData,
          applied_at: new Date().toISOString()
        })

      if (actionError) {
        console.error('Error recording safety action:', actionError)
        return false
      }

      // 사용자 상태 업데이트
      let updateData: any = {}
      
      switch (actionData.action_type) {
        case 'temporary_ban':
          updateData = {
            account_status: 'suspended',
            suspension_until: new Date(Date.now() + (actionData.duration || 24) * 60 * 60 * 1000).toISOString()
          }
          break
        case 'permanent_ban':
          updateData = {
            account_status: 'banned',
            banned_at: new Date().toISOString()
          }
          break
        case 'profile_review':
          updateData = {
            account_status: 'under_review'
          }
          break
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
      }

      // 사용자에게 알림
      await notificationService.createNotification({
        user_id: userId,
        type: 'system',
        title: '계정 조치 알림',
        body: `계정에 안전 조치가 적용되었습니다: ${actionData.reason}`,
        is_read: false
      })

      return true
    } catch (error) {
      console.error('Error applying safety action:', error)
      return false
    }
  }

  // 사용자 상호작용 비활성화
  private async deactivateUserInteractions(userId1: string, userId2: string) {
    try {
      // 매치 비활성화
      await supabase
        .from('matches')
        .update({ is_active: false })
        .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)

      // 채팅방 비활성화
      const { data: chatRooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .contains('participants', [userId1, userId2])

      if (chatRooms && chatRooms.length > 0) {
        await supabase
          .from('chat_rooms')
          .update({ is_active: false })
          .in('id', chatRooms.map(room => room.id))
      }
    } catch (error) {
      console.error('Error deactivating user interactions:', error)
    }
  }

  // 관리자에게 신고 알림
  private async notifyAdminsOfNewReport(report: ReportData) {
    try {
      // 관리자 사용자들 조회
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'system' as const,
          title: `새로운 신고 (${report.priority.toUpperCase()})`,
          body: `${report.report_type} 유형의 신고가 접수되었습니다.`,
          data: { reportId: report.id },
          is_read: false
        }))

        await supabase
          .from('notifications')
          .insert(notifications)
      }
    } catch (error) {
      console.error('Error notifying admins:', error)
    }
  }

  // 신고 통계
  async getReportStatistics(days: number = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      
      // 신고 유형별 통계
      const { data: reportsByType } = await supabase
        .from('reports')
        .select('report_type')
        .gte('created_at', since)

      // 상태별 통계
      const { data: reportsByStatus } = await supabase
        .from('reports')
        .select('status')
        .gte('created_at', since)

      // 우선순위별 통계
      const { data: reportsByPriority } = await supabase
        .from('reports')
        .select('priority')
        .gte('created_at', since)

      return {
        byType: this.groupBy(reportsByType || [], 'report_type'),
        byStatus: this.groupBy(reportsByStatus || [], 'status'),
        byPriority: this.groupBy(reportsByPriority || [], 'priority')
      }
    } catch (error) {
      console.error('Error getting report statistics:', error)
      return { byType: {}, byStatus: {}, byPriority: {} }
    }
  }

  // 헬퍼: 배열을 키로 그룹화
  private groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown'
      groups[group] = (groups[group] || 0) + 1
      return groups
    }, {})
  }

  // 신고 검색
  async searchReports(query: {
    status?: ReportData['status']
    priority?: ReportData['priority']
    report_type?: ReportData['report_type']
    reporter_id?: string
    reported_user_id?: string
    page?: number
    limit?: number
  }) {
    try {
      const { status, priority, report_type, reporter_id, reported_user_id, page = 1, limit = 20 } = query
      const from = (page - 1) * limit
      
      let queryBuilder = supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey (full_name, avatar_url),
          reported_user:profiles!reports_reported_user_id_fkey (full_name, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1)

      if (status) queryBuilder = queryBuilder.eq('status', status)
      if (priority) queryBuilder = queryBuilder.eq('priority', priority)
      if (report_type) queryBuilder = queryBuilder.eq('report_type', report_type)
      if (reporter_id) queryBuilder = queryBuilder.eq('reporter_id', reporter_id)
      if (reported_user_id) queryBuilder = queryBuilder.eq('reported_user_id', reported_user_id)

      const { data, error, count } = await queryBuilder

      if (error) {
        console.error('Error searching reports:', error)
        return { reports: [], total: 0 }
      }

      return { reports: data || [], total: count || 0 }
    } catch (error) {
      console.error('Error searching reports:', error)
      return { reports: [], total: 0 }
    }
  }
}

export const reportingService = new ReportingService()