// Chat service — client-side helper used by src/app/messages/[roomId]/page.tsx
// Wraps /api/chat/messages (POST/GET) + Supabase Realtime for live updates.
import { supabase } from '@/../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
  is_flagged?: boolean
}

export interface ChatPartner {
  id: string
  full_name: string
  avatar_url: string | null
  country: string | null
}

export interface ChatRoom {
  id: string
  booking_id: string | null
  user_id: string
  host_id: string
  created_at: string
  partner?: ChatPartner
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export const chatService = {
  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    // N+1 방지: chat_rooms와 messages를 단일 쿼리로 조인.
    // 파트너 프로필은 별도 쿼리 1회로 일괄 조회.
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        id, booking_id, user_id, host_id, created_at,
        user_last_read_at, host_last_read_at,
        messages(content, created_at, sender_id)
      `)
      .or(`user_id.eq.${userId},host_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data) return []

    type RawRoom = {
      id: string
      booking_id: string | null
      user_id: string
      host_id: string
      created_at: string
      user_last_read_at: string | null
      host_last_read_at: string | null
      messages?: Array<{ content: string; created_at: string; sender_id: string }>
    }

    const rows = data as RawRoom[]

    // 파트너 ID 목록을 한 번에 수집 → 단일 IN 쿼리
    const partnerIds = [...new Set(rows.map((r) =>
      r.user_id === userId ? r.host_id : r.user_id
    ))]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, country')
      .in('id', partnerIds)

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    )

    return rows.map((row) => {
      const partnerId = row.user_id === userId ? row.host_id : row.user_id
      const profile = profileMap.get(partnerId)
      const sortedMsgs = (row.messages ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      return {
        id: row.id,
        booking_id: row.booking_id,
        user_id: row.user_id,
        host_id: row.host_id,
        created_at: row.created_at,
        partner: profile
          ? {
              id: profile.id,
              full_name: (profile as { display_name?: string }).display_name ?? 'Unknown',
              avatar_url: null,
              country: (profile as { country?: string }).country ?? null,
            }
          : undefined,
        last_message: sortedMsgs[0]?.content,
        last_message_at: sortedMsgs[0]?.created_at,
        // 본인의 last_read_at 이후에 상대방이 보낸 메시지만 미읽음으로 카운트
        unread_count: (() => {
          const myLastRead = row.user_id === userId
            ? row.user_last_read_at
            : row.host_last_read_at
          return (row.messages ?? []).filter(m =>
            m.sender_id !== userId &&
            (!myLastRead || new Date(m.created_at) > new Date(myLastRead))
          ).length
        })(),
      }
    })
  },

  async getRoomMessages(roomId: string): Promise<Message[]> {
    const token = await getAuthToken()
    if (!token) return []

    const params = new URLSearchParams({ room_id: roomId, limit: '50' })
    const res = await fetch(`/api/chat/messages?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json.data ?? []) as Message[]
  },

  async sendMessage(roomId: string, _senderId: string, content: string): Promise<Message | null> {
    const token = await getAuthToken()
    if (!token) return null

    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ room_id: roomId, content }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      if (err.redirect) throw Object.assign(new Error(err.error ?? 'forbidden'), { redirect: err.redirect as string })
      return null
    }
    const json = await res.json()
    return json.data ?? null
  },

  async markMessagesAsRead(roomId: string, _userId: string): Promise<void> {
    // DB RPC: chat_rooms.user_last_read_at 또는 host_last_read_at 갱신
    // auth.uid()는 RPC 내부에서 직접 추출 (인자 없이 안전)
    await supabase.rpc('mark_chat_room_read', { p_room_id: roomId })
  },

  subscribeToMessages(
    roomId: string,
    callback: (message: Message) => void
  ): RealtimeChannel {
    return supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callback(payload.new as Message)
        }
      )
      .subscribe()
  },
}
