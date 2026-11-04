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
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export const chatService = {
  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        id, booking_id, user_id, host_id, created_at,
        messages(content, created_at)
      `)
      .or(`user_id.eq.${userId},host_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error || !data) return []

    const rooms: ChatRoom[] = []
    for (const row of data as Array<{
      id: string
      booking_id: string | null
      user_id: string
      host_id: string
      created_at: string
      messages?: Array<{ content: string; created_at: string }>
    }>) {
      const partnerId = row.user_id === userId ? row.host_id : row.user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, country')
        .eq('id', partnerId)
        .single()

      const sortedMsgs = (row.messages ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      rooms.push({
        id: row.id,
        booking_id: row.booking_id,
        user_id: row.user_id,
        host_id: row.host_id,
        created_at: row.created_at,
        partner: profile
          ? {
              id: profile.id,
              full_name: profile.display_name ?? 'Unknown',
              avatar_url: null,
              country: profile.country ?? null,
            }
          : undefined,
        last_message: sortedMsgs[0]?.content,
        last_message_at: sortedMsgs[0]?.created_at,
      })
    }
    return rooms
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
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  },

  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    // Supabase Realtime으로 실시간 처리 — 별도 read-receipt 테이블 없음.
    // 향후 read_receipts 테이블 추가 시 여기서 UPDATE.
    void roomId
    void userId
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
