import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Firebase Admin SDK (서버 사이드)
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

// Firebase Admin 초기화
if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      projectId: process.env.FIREBASE_PROJECT_ID
    })
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, payload } = await req.json()

    if (!userId || !payload) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 사용자의 디바이스 토큰들 가져오기
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token, device_type')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching device tokens:', error)
      return NextResponse.json({ error: 'Failed to fetch device tokens' }, { status: 500 })
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: 'No device tokens found' })
    }

    // Firebase Admin SDK를 통해 푸시 알림 전송
    const messaging = getMessaging()
    const results = []

    for (const tokenData of tokens) {
      try {
        const message = {
          token: tokenData.token,
          notification: {
            title: payload.title,
            body: payload.body
          },
          data: payload.data ? JSON.stringify(payload.data) : undefined,
          webpush: tokenData.device_type === 'web' ? {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'globalmatch',
              requireInteraction: false,
              actions: [
                {
                  action: 'open',
                  title: '열기'
                }
              ]
            },
            fcmOptions: {
              link: process.env.NEXT_PUBLIC_APP_URL || 'https://globalmatch.app'
            }
          } : undefined
        }

        const result = await messaging.send(message)
        results.push({ token: tokenData.token, success: true, messageId: result })
      } catch (error: any) {
        console.error('Error sending notification to token:', tokenData.token, error)
        
        // 토큰이 유효하지 않은 경우 삭제
        if (error.code === 'messaging/registration-token-not-registered' || 
            error.code === 'messaging/invalid-registration-token') {
          await supabase
            .from('device_tokens')
            .delete()
            .eq('token', tokenData.token)
        }

        results.push({ token: tokenData.token, success: false, error: error.message })
      }
    }

    return NextResponse.json({ 
      message: 'Notification send completed',
      results,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length
    })

  } catch (error: any) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}