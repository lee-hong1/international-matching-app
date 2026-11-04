import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

let firebaseInitialized = false

async function getFirebaseMessaging() {
  if (!process.env.FIREBASE_PROJECT_ID) return null
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app')
    const { getMessaging } = await import('firebase-admin/messaging')
    if (!firebaseInitialized && getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
      firebaseInitialized = true
    }
    return getMessaging()
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, payload } = await req.json()

    if (!userId || !payload) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

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

    const messaging = await getFirebaseMessaging()
    if (!messaging) {
      return NextResponse.json({ message: 'Push notifications not configured' })
    }

    const results = []
    const staleTokens: string[] = []

    for (const tokenData of tokens) {
      try {
        const message = {
          token: tokenData.token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data ? JSON.stringify(payload.data) : undefined,
          webpush: tokenData.device_type === 'web' ? {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: 'globalmatch',
              requireInteraction: false,
              actions: [{ action: 'open', title: '열기' }],
            },
            fcmOptions: { link: process.env.NEXT_PUBLIC_APP_URL ?? 'https://globalmatch.app' },
          } : undefined,
        }

        const result = await messaging.send(message)
        results.push({ token: tokenData.token, success: true, messageId: result })
      } catch (error: any) {
        if (
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token'
        ) {
          staleTokens.push(tokenData.token)
        }
        results.push({ token: tokenData.token, success: false, error: error.message })
      }
    }

    // 만료 토큰 일괄 삭제 (N+1 방지)
    if (staleTokens.length > 0) {
      await supabase.from('device_tokens').delete().in('token', staleTokens)
    }

    return NextResponse.json({
      message: 'Notification send completed',
      results,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
    })
  } catch (error: any) {
    console.error('Send notification error:', error)
    return NextResponse.json({ error: error.message ?? 'Internal server error' }, { status: 500 })
  }
}
