import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging'
import { supabase } from './supabase'

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Firebase 앱 초기화
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export interface NotificationData {
  id?: string
  user_id: string
  type: 'match' | 'message' | 'like' | 'profile_view' | 'system'
  title: string
  body: string
  data?: any
  is_read: boolean
  created_at?: string
}

export interface DeviceToken {
  user_id: string
  token: string
  device_type: 'web' | 'ios' | 'android'
  created_at?: string
  updated_at?: string
}

class NotificationService {
  private messaging: any = null
  private vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

  constructor() {
    if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
      this.initializeMessaging()
    }
  }

  private async initializeMessaging() {
    try {
      this.messaging = getMessaging(app)
    } catch (error) {
      console.error('Failed to initialize messaging:', error)
    }
  }

  // 푸시 알림 권한 요청
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  // FCM 토큰 가져오기
  async getDeviceToken(userId: string): Promise<string | null> {
    if (!this.messaging || !this.vapidKey) {
      return null
    }

    try {
      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey
      })

      if (token) {
        // 토큰을 데이터베이스에 저장
        await this.saveDeviceToken(userId, token, 'web')
        return token
      }

      return null
    } catch (error) {
      console.error('Error getting device token:', error)
      return null
    }
  }

  // 디바이스 토큰 저장
  async saveDeviceToken(userId: string, token: string, deviceType: 'web' | 'ios' | 'android') {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .upsert({
          user_id: userId,
          token,
          device_type: deviceType,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving device token:', error)
      }
    } catch (error) {
      console.error('Error saving device token:', error)
    }
  }

  // 포그라운드 메시지 리스너
  onForegroundMessage(callback: (payload: MessagePayload) => void) {
    if (!this.messaging) return

    return onMessage(this.messaging, callback)
  }

  // 알림 생성 (서버 사이드)
  async createNotification(notification: Omit<NotificationData, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()

      if (error) {
        console.error('Error creating notification:', error)
        return null
      }

      // 실시간으로 푸시 알림 전송
      await this.sendPushNotification(notification.user_id, {
        title: notification.title,
        body: notification.body,
        data: notification.data
      })

      return data[0]
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    }
  }

  // 푸시 알림 전송 (서버 API 호출)
  async sendPushNotification(userId: string, payload: {
    title: string
    body: string
    data?: any
  }) {
    try {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          payload
        })
      })
    } catch (error) {
      console.error('Error sending push notification:', error)
    }
  }

  // 사용자 알림 목록 가져오기
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    try {
      const from = (page - 1) * limit
      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1)

      if (error) {
        console.error('Error fetching notifications:', error)
        return { notifications: [], total: 0 }
      }

      return { notifications: data || [], total: count || 0 }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return { notifications: [], total: 0 }
    }
  }

  // 읽지 않은 알림 개수
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // 알림 읽음 처리
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // 브라우저 알림 표시 (로컬)
  showBrowserNotification(title: string, options?: NotificationOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null
    }

    if (Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'globalmatch',
        renotify: false,
        ...options
      })
    }

    return null
  }

  // 실시간 알림 구독
  subscribeToNotifications(userId: string, callback: (notification: NotificationData) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        callback(payload.new as NotificationData)
      })
      .subscribe()
  }

  // 알림 삭제
  async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Error deleting notification:', error)
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // 알림 설정 업데이트
  async updateNotificationSettings(userId: string, settings: {
    matches: boolean
    messages: boolean
    likes: boolean
    profile_views: boolean
    marketing: boolean
  }) {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating notification settings:', error)
      }
    } catch (error) {
      console.error('Error updating notification settings:', error)
    }
  }

  // 자주 사용하는 알림 생성 헬퍼 메서드들
  async notifyNewMatch(userId: string, matchedUserName: string) {
    return this.createNotification({
      user_id: userId,
      type: 'match',
      title: '새로운 매칭! 🎉',
      body: `${matchedUserName}님과 매칭되었습니다!`,
      is_read: false
    })
  }

  async notifyNewMessage(userId: string, senderName: string, messagePreview: string) {
    return this.createNotification({
      user_id: userId,
      type: 'message',
      title: `${senderName}님의 새 메시지`,
      body: messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : ''),
      is_read: false
    })
  }

  async notifyNewLike(userId: string, likerName: string) {
    return this.createNotification({
      user_id: userId,
      type: 'like',
      title: '새로운 좋아요! 💕',
      body: `${likerName}님이 회원님을 좋아합니다!`,
      is_read: false
    })
  }

  async notifyProfileView(userId: string, viewerName: string) {
    return this.createNotification({
      user_id: userId,
      type: 'profile_view',
      title: '프로필 조회 👀',
      body: `${viewerName}님이 회원님의 프로필을 보았습니다`,
      is_read: false
    })
  }
}

export const notificationService = new NotificationService()