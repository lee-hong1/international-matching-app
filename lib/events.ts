import { supabase } from './supabase'
import { calculateCommission } from './payments'

export type EventType = 'drink' | 'meal' | 'party'
export type VenueType = 'partner' | 'custom'
export type EventStatus = 'open' | 'closed' | 'completed' | 'cancelled'

export interface PartnerVenue {
  id: string
  name: string
  category: string
  address: string
  description: string | null
  image_url: string | null
  capacity: number | null
  regular_price: number | null
  discount_price: number | null
  commission_rate: number
  is_active: boolean
}

export interface EventItem {
  id: string
  host_id: string
  event_type: EventType
  title: string
  description: string | null
  venue_type: VenueType
  venue_id: string | null
  custom_location: string | null
  event_datetime: string
  max_participants: number
  fee_per_person: number
  platform_fee_rate: number
  status: EventStatus
  participants_count: number
  created_at: string
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null
  partner_venues?: PartnerVenue | null
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  drink: '술 친구',
  meal: '밥 친구',
  party: '파티원 모집',
}

export const eventsService = {
  // 제휴 매장 목록
  async getPartnerVenues(): Promise<PartnerVenue[]> {
    const { data, error } = await supabase
      .from('partner_venues')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error || !data) return []
    return data
  },

  // 이벤트 생성 (프리미엄 회원만 - DB RLS에서도 검증)
  async createEvent(input: {
    eventType: EventType
    title: string
    description?: string
    venueType: VenueType
    venueId?: string
    customLocation?: string
    eventDatetime: string
    maxParticipants: number
    feePerPerson: number
  }): Promise<{ event: EventItem | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { event: null, error: new Error('인증이 필요합니다') }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (!profile?.is_premium) {
      return { event: null, error: new Error('유료 회원만 이벤트를 만들 수 있습니다') }
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        host_id: user.id,
        event_type: input.eventType,
        title: input.title,
        description: input.description ?? null,
        venue_type: input.venueType,
        venue_id: input.venueType === 'partner' ? input.venueId : null,
        custom_location: input.venueType === 'custom' ? input.customLocation : null,
        event_datetime: input.eventDatetime,
        max_participants: input.maxParticipants,
        fee_per_person: input.feePerPerson,
      })
      .select()
      .single()

    if (error || !event) return { event: null, error }

    // 호스트를 팔로우하는 회원들에게 이벤트 알림 발송
    await this.notifyFollowers(event.id, user.id)

    return { event, error: null }
  },

  // 호스트의 팔로워들에게 이벤트 알림 생성
  async notifyFollowers(eventId: string, hostId: string) {
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', hostId)

    if (!followers || followers.length === 0) return

    const notifications = followers.map((f) => ({
      event_id: eventId,
      recipient_id: f.follower_id,
    }))

    await supabase.from('event_notifications').insert(notifications)
  },

  // 열려있는 이벤트 목록 (탐색)
  async getEvents(eventType?: EventType, limit = 20, offset = 0): Promise<EventItem[]> {
    let query = supabase
      .from('events')
      .select(`
        *,
        profiles!events_host_id_fkey (id, full_name, avatar_url),
        partner_venues (id, name, category, address, image_url, discount_price)
      `)
      .eq('status', 'open')
      .gt('event_datetime', new Date().toISOString())
      .order('event_datetime', { ascending: true })
      .range(offset, offset + limit - 1)

    if (eventType) query = query.eq('event_type', eventType)

    const { data, error } = await query
    if (error || !data) return []
    return data as unknown as EventItem[]
  },

  // 이벤트 상세
  async getEvent(eventId: string): Promise<EventItem | null> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles!events_host_id_fkey (id, full_name, avatar_url),
        partner_venues (id, name, category, address, image_url, discount_price, capacity)
      `)
      .eq('id', eventId)
      .single()

    if (error || !data) return null
    return data as unknown as EventItem
  },

  // 내가 호스트한 이벤트 목록
  async getMyHostedEvents(): Promise<EventItem[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('events')
      .select(`*, partner_venues (id, name, category, address, image_url, discount_price)`)
      .eq('host_id', user.id)
      .order('event_datetime', { ascending: false })

    if (error || !data) return []
    return data as unknown as EventItem[]
  },

  // 내가 신청한 이벤트 목록
  async getMyApplications(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        id, status, applied_at,
        events (
          id, title, event_type, event_datetime, fee_per_person, status,
          profiles!events_host_id_fkey (id, full_name, avatar_url)
        )
      `)
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })

    if (error || !data) return []
    return data
  },

  // 이벤트 참가자 목록 (호스트용)
  async getEventParticipants(eventId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        id, status, applied_at,
        profiles!event_participants_user_id_fkey (id, full_name, avatar_url)
      `)
      .eq('event_id', eventId)
      .order('applied_at', { ascending: false })

    if (error || !data) return []
    return data
  },

  // 참가 신청 승인/거절 (호스트)
  async updateParticipantStatus(participantId: string, status: 'approved' | 'rejected'): Promise<{ error: any }> {
    const { error } = await supabase
      .from('event_participants')
      .update({ status })
      .eq('id', participantId)

    return { error }
  },

  // 알림 목록
  async getNotifications(limit = 20): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('event_notifications')
      .select(`
        id, is_read, created_at,
        events (
          id, title, event_type, event_datetime, fee_per_person,
          profiles!events_host_id_fkey (id, full_name, avatar_url)
        )
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data
  },

  async getUnreadNotificationCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count } = await supabase
      .from('event_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    return count ?? 0
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await supabase
      .from('event_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  },

  // 이벤트 참가 신청 시 수수료 분배 계산 (결제 확정 단계에서 사용)
  calculateEventCommission(event: EventItem) {
    const venueCommissionRate = event.venue_type === 'partner' ? event.partner_venues?.commission_rate ?? 0 : 0
    return calculateCommission(event.fee_per_person, event.platform_fee_rate, venueCommissionRate)
  },
}
