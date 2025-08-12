import { supabase } from './supabase'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content: string
  template_type: 'welcome' | 'match_notification' | 'message_notification' | 'premium_promotion' | 'newsletter' | 'verification' | 'password_reset'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailJob {
  id: string
  recipient_email: string
  recipient_name?: string
  template_id: string
  template_variables: any
  scheduled_at?: string
  sent_at?: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  error_message?: string
  created_at: string
}

export interface EmailCampaign {
  id: string
  name: string
  subject: string
  template_id: string
  recipient_filter: any // JSON filter for target users
  scheduled_at?: string
  sent_at?: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  total_recipients: number
  sent_count: number
  opened_count: number
  clicked_count: number
  created_at: string
}

class EmailService {
  private apiEndpoint = '/api/email'

  // 이메일 전송 (개별)
  async sendEmail(
    recipientEmail: string,
    templateName: string,
    variables: any = {},
    recipientName?: string,
    scheduleAt?: Date
  ): Promise<boolean> {
    try {
      // 템플릿 조회
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('name', templateName)
        .eq('is_active', true)
        .single()

      if (templateError || !template) {
        console.error('Email template not found:', templateName)
        return false
      }

      // 이메일 작업 생성
      const { error: jobError } = await supabase
        .from('email_jobs')
        .insert({
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          template_id: template.id,
          template_variables: variables,
          scheduled_at: scheduleAt?.toISOString(),
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (jobError) {
        console.error('Failed to create email job:', jobError)
        return false
      }

      // 즉시 전송인 경우 처리
      if (!scheduleAt) {
        await this.processEmailJob(recipientEmail, template, variables, recipientName)
      }

      return true
    } catch (error) {
      console.error('Email sending error:', error)
      return false
    }
  }

  // 실제 이메일 전송 처리
  private async processEmailJob(
    recipientEmail: string,
    template: EmailTemplate,
    variables: any,
    recipientName?: string
  ) {
    try {
      // 템플릿 변수 치환
      const processedSubject = this.replaceTemplateVariables(template.subject, variables)
      const processedHtmlContent = this.replaceTemplateVariables(template.html_content, variables)
      const processedTextContent = this.replaceTemplateVariables(template.text_content, variables)

      // 외부 이메일 서비스 API 호출 (예: SendGrid, AWS SES, Mailgun 등)
      const emailData = {
        to: recipientEmail,
        subject: processedSubject,
        html: processedHtmlContent,
        text: processedTextContent,
        recipientName
      }

      const response = await fetch(this.apiEndpoint + '/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      })

      if (!response.ok) {
        throw new Error('Failed to send email')
      }

      // 전송 성공 시 상태 업데이트
      await supabase
        .from('email_jobs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('recipient_email', recipientEmail)
        .eq('template_id', template.id)
        .is('sent_at', null)

    } catch (error) {
      console.error('Email processing error:', error)
      
      // 전송 실패 시 상태 업데이트
      await supabase
        .from('email_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('recipient_email', recipientEmail)
        .eq('template_id', template.id)
        .is('sent_at', null)
    }
  }

  // 템플릿 변수 치환
  private replaceTemplateVariables(content: string, variables: any): string {
    let processedContent = content

    // 기본 변수들
    const defaultVariables = {
      app_name: 'GlobalMatch',
      app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://globalmatch.app',
      support_email: 'support@globalmatch.app',
      current_year: new Date().getFullYear().toString()
    }

    const allVariables = { ...defaultVariables, ...variables }

    // 변수 치환 ({{variable_name}} 형식)
    for (const [key, value] of Object.entries(allVariables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedContent = processedContent.replace(regex, String(value || ''))
    }

    return processedContent
  }

  // 웰컴 이메일 전송
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    return this.sendEmail(userEmail, 'welcome', {
      user_name: userName,
      profile_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    }, userName)
  }

  // 매치 알림 이메일
  async sendMatchNotification(userEmail: string, userName: string, matchedUserName: string): Promise<boolean> {
    return this.sendEmail(userEmail, 'match_notification', {
      user_name: userName,
      matched_user_name: matchedUserName,
      matches_url: `${process.env.NEXT_PUBLIC_APP_URL}/messages`
    }, userName)
  }

  // 새 메시지 알림 이메일
  async sendMessageNotification(
    userEmail: string, 
    userName: string, 
    senderName: string, 
    messagePreview: string
  ): Promise<boolean> {
    return this.sendEmail(userEmail, 'message_notification', {
      user_name: userName,
      sender_name: senderName,
      message_preview: messagePreview.substring(0, 100),
      messages_url: `${process.env.NEXT_PUBLIC_APP_URL}/messages`
    }, userName)
  }

  // 프리미엄 프로모션 이메일
  async sendPremiumPromotion(userEmail: string, userName: string, discountCode?: string): Promise<boolean> {
    return this.sendEmail(userEmail, 'premium_promotion', {
      user_name: userName,
      discount_code: discountCode || '',
      premium_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium`
    }, userName)
  }

  // 이메일 인증 메일
  async sendVerificationEmail(userEmail: string, userName: string, verificationToken: string): Promise<boolean> {
    return this.sendEmail(userEmail, 'verification', {
      user_name: userName,
      verification_url: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`
    }, userName)
  }

  // 비밀번호 재설정 이메일
  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean> {
    return this.sendEmail(userEmail, 'password_reset', {
      user_name: userName,
      reset_url: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    }, userName)
  }

  // 이메일 캠페인 생성
  async createEmailCampaign(
    name: string,
    templateName: string,
    subject: string,
    recipientFilter: any,
    scheduleAt?: Date
  ): Promise<string | null> {
    try {
      // 템플릿 조회
      const { data: template } = await supabase
        .from('email_templates')
        .select('id')
        .eq('name', templateName)
        .single()

      if (!template) {
        throw new Error('Template not found')
      }

      // 수신자 수 계산
      const recipientCount = await this.calculateRecipientCount(recipientFilter)

      // 캠페인 생성
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          name,
          subject,
          template_id: template.id,
          recipient_filter: recipientFilter,
          scheduled_at: scheduleAt?.toISOString(),
          status: scheduleAt ? 'scheduled' : 'draft',
          total_recipients: recipientCount,
          sent_count: 0,
          opened_count: 0,
          clicked_count: 0,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to create email campaign:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Email campaign creation error:', error)
      return null
    }
  }

  // 수신자 수 계산
  private async calculateRecipientCount(filter: any): Promise<number> {
    try {
      let query = supabase.from('profiles').select('id', { count: 'exact' })

      // 필터 조건 적용
      if (filter.countries && filter.countries.length > 0) {
        query = query.in('country', filter.countries)
      }

      if (filter.age_range) {
        const today = new Date()
        const minBirthDate = new Date(today.getFullYear() - filter.age_range.max, today.getMonth(), today.getDate())
        const maxBirthDate = new Date(today.getFullYear() - filter.age_range.min, today.getMonth(), today.getDate())
        query = query.gte('birth_date', minBirthDate.toISOString()).lte('birth_date', maxBirthDate.toISOString())
      }

      if (filter.premium_only) {
        const { data: premiumUsers } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('status', 'active')
        
        if (premiumUsers) {
          query = query.in('id', premiumUsers.map(s => s.user_id))
        }
      }

      if (filter.last_active_days) {
        const since = new Date(Date.now() - filter.last_active_days * 24 * 60 * 60 * 1000)
        const { data: activeUsers } = await supabase
          .from('user_behavior_stats')
          .select('user_id')
          .gte('last_active_at', since.toISOString())
        
        if (activeUsers) {
          query = query.in('id', activeUsers.map(u => u.user_id))
        }
      }

      const { count } = await query
      return count || 0
    } catch (error) {
      console.error('Error calculating recipient count:', error)
      return 0
    }
  }

  // 이메일 전송 통계
  async getEmailStatistics(days: number = 30): Promise<{
    total_sent: number
    total_opened: number
    total_clicked: number
    open_rate: number
    click_rate: number
    recent_campaigns: EmailCampaign[]
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const [sentResult, campaignsResult] = await Promise.all([
        supabase
          .from('email_jobs')
          .select('id', { count: 'exact' })
          .eq('status', 'sent')
          .gte('sent_at', since),
        supabase
          .from('email_campaigns')
          .select('*')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // 캠페인들의 통계 합계
      const totalOpened = campaignsResult.data?.reduce((sum, campaign) => sum + campaign.opened_count, 0) || 0
      const totalClicked = campaignsResult.data?.reduce((sum, campaign) => sum + campaign.clicked_count, 0) || 0
      const totalSent = sentResult.count || 0

      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0

      return {
        total_sent: totalSent,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        open_rate: openRate,
        click_rate: clickRate,
        recent_campaigns: campaignsResult.data || []
      }
    } catch (error) {
      console.error('Error getting email statistics:', error)
      return {
        total_sent: 0,
        total_opened: 0,
        total_clicked: 0,
        open_rate: 0,
        click_rate: 0,
        recent_campaigns: []
      }
    }
  }

  // 이메일 수신 설정 업데이트
  async updateEmailPreferences(userId: string, preferences: {
    match_notifications: boolean
    message_notifications: boolean
    newsletter: boolean
    promotional: boolean
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to update email preferences:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Email preferences update error:', error)
      return false
    }
  }

  // 이메일 수신 거부 처리
  async unsubscribe(email: string, type: 'all' | 'marketing' = 'all'): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (!profile) {
        return false
      }

      const updates = type === 'all' 
        ? {
            match_notifications: false,
            message_notifications: false,
            newsletter: false,
            promotional: false
          }
        : {
            newsletter: false,
            promotional: false
          }

      return await this.updateEmailPreferences(profile.id, updates)
    } catch (error) {
      console.error('Unsubscribe error:', error)
      return false
    }
  }
}

export const emailService = new EmailService()