import { supabase } from './supabase'

export interface ChatRoom {
  id: string
  match_id: string
  created_at: string
  last_message_at: string
  partner?: {
    id: string
    full_name: string
    avatar_url?: string
    country: string
  }
  last_message?: {
    content: string
    sender_id: string
    created_at: string
  }
}

export interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file'
  is_read: boolean
  created_at: string
  sender?: {
    full_name: string
    avatar_url?: string
  }
}

export const chatService = {
  // 사용자의 채팅방 목록 가져오기
  async getUserChatRooms(userId: string): Promise<ChatRoom[]> {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        matches!inner(
          id,
          user1_id,
          user2_id,
          user1:profiles!matches_user1_id_fkey(id, full_name, avatar_url, country),
          user2:profiles!matches_user2_id_fkey(id, full_name, avatar_url, country)
        ),
        messages(
          content,
          sender_id,
          created_at
        )
      `)
      .eq('matches.is_mutual', true)
      .or(`matches.user1_id.eq.${userId},matches.user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching chat rooms:', error)
      return []
    }

    return data?.map(room => {
      const match = room.matches as any
      const isUser1 = match.user1_id === userId
      const partner = isUser1 ? match.user2 : match.user1
      const lastMessage = room.messages?.[0]

      return {
        ...room,
        partner,
        last_message: lastMessage
      }
    }) || []
  },

  // 특정 채팅방의 메시지 가져오기
  async getRoomMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  },

  // 메시지 전송
  async sendMessage(roomId: string, senderId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text') {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        message_type: messageType
      })
      .select()

    if (!error && data) {
      // 채팅방의 마지막 메시지 시간 업데이트
      await supabase
        .from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', roomId)
    }

    return { data, error }
  },

  // 메시지 읽음 처리
  async markMessagesAsRead(roomId: string, userId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', userId)
      .eq('is_read', false)

    return { error }
  },

  // 실시간 메시지 구독
  subscribeToMessages(roomId: string, callback: (message: Message) => void) {
    const subscription = supabase
      .channel(`messages:${roomId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        }, 
        async (payload) => {
          // 발신자 정보와 함께 메시지 가져오기
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            callback(data)
          }
        }
      )
      .subscribe()

    return subscription
  },

  // 채팅방 구독 (마지막 메시지 업데이트 등)
  subscribeToChatRooms(userId: string, callback: (room: ChatRoom) => void) {
    const subscription = supabase
      .channel(`chat_rooms:${userId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        async (payload) => {
          // 업데이트된 채팅방 정보 가져오기
          const rooms = await this.getUserChatRooms(userId)
          const updatedRoom = rooms.find(room => room.id === payload.new?.id)
          if (updatedRoom) {
            callback(updatedRoom)
          }
        }
      )
      .subscribe()

    return subscription
  },

  // 읽지 않은 메시지 개수 가져오기
  async getUnreadMessageCount(userId: string): Promise<number> {
    // 사용자가 참여한 채팅방들의 ID 가져오기
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        matches!inner(user1_id, user2_id)
      `)
      .or(`matches.user1_id.eq.${userId},matches.user2_id.eq.${userId}`)

    if (!rooms || rooms.length === 0) return 0

    const roomIds = rooms.map(room => room.id)

    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .in('room_id', roomIds)
      .neq('sender_id', userId)
      .eq('is_read', false)

    if (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }

    return count || 0
  },

  // 이미지 업로드
  async uploadImage(file: File, roomId: string): Promise<string | null> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${roomId}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file)

    if (error) {
      console.error('Error uploading image:', error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  },

  // 번역 기능 (Google Translate API 사용 예정)
  async translateMessage(text: string, targetLanguage: string): Promise<string> {
    // TODO: Google Translate API 연동
    // 현재는 임시로 원본 텍스트 반환
    return text
  },

  // 채팅방 차단
  async blockUser(blockerId: string, blockedId: string) {
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId
      })

    return { data, error }
  },

  // 사용자 신고
  async reportUser(reporterId: string, reportedId: string, reason: string, description?: string) {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        reason,
        description
      })

    return { data, error }
  }
}