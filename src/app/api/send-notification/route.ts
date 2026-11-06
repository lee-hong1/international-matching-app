import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

type NotificationData = Record<string, string>

function sanitizeData(raw: Record<string, unknown>): NotificationData {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v)])
  )
}

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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`send-notification:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  // 내부 서버→서버 전용: x-service-key 필수
  const authHeader = req.headers.get('x-service-key')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || authHeader !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    // 호출 측이 userId 또는 user_id 모두 허용
    const userId: string = body.userId ?? body.user_id ?? ''
    const payload = body.payload ?? { title: body.title, body: body.body, data: body.data }

    if (!userId || !isValidUuid(userId)) {
      return NextResponse.json({ error: 'Valid userId required' }, { status: 400 })
    }
    if (!payload?.title) {
      return NextResponse.json({ error: 'payload.title required' }, { status: 400 })
    }

    const { data: tokens, error } = await supabaseService
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

    const webTokens = tokens.filter((t) => t.device_type === 'web').map((t) => t.token)
    const nativeTokens = tokens.filter((t) => t.device_type !== 'web').map((t) => t.token)
    const staleTokens: string[] = []
    let successCount = 0
    let errorCount = 0

    const BATCH_SIZE = 500

    async function sendBatch(batchTokens: string[], isWeb: boolean) {
      for (let i = 0; i < batchTokens.length; i += BATCH_SIZE) {
        const batch = batchTokens.slice(i, i + BATCH_SIZE)
        const multicastMessage = {
          tokens: batch,
          notification: { title: payload.title, body: payload.body },
          data: payload.data ? sanitizeData(payload.data as Record<string, unknown>) : undefined,
          ...(isWeb ? {
            webpush: {
              notification: {
                title: payload.title,
                body: payload.body,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png',
                tag: 'globalmatch',
                requireInteraction: false,
                actions: [{ action: 'open', title: 'Open' }],
              },
              fcmOptions: { link: process.env.NEXT_PUBLIC_APP_URL ?? 'https://globalmatch.app' },
            },
          } : {}),
        }

        const result = await messaging!.sendEachForMulticast(multicastMessage)
        successCount += result.successCount
        errorCount += result.failureCount

        result.responses.forEach((resp: { success: boolean; error?: { code: string } }, idx: number) => {
          if (!resp.success && resp.error) {
            const code = resp.error.code
            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              staleTokens.push(batch[idx])
            }
          }
        })
      }
    }

    await Promise.all([
      webTokens.length > 0 ? sendBatch(webTokens, true) : Promise.resolve(),
      nativeTokens.length > 0 ? sendBatch(nativeTokens, false) : Promise.resolve(),
    ])

    if (staleTokens.length > 0) {
      await supabaseService.from('device_tokens').delete().in('token', staleTokens)
    }

    return NextResponse.json({
      message: 'Notification send completed',
      successCount,
      errorCount,
      staleRemoved: staleTokens.length,
    })
  } catch (error: unknown) {
    console.error('Send notification error:', (error as Error).message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
