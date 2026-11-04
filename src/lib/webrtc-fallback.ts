export type WebRTCMode = 'video' | 'chat-only' | 'failed'

export interface FallbackCallbacks {
  onModeChange: (mode: WebRTCMode) => void
  onRetry: () => void
}

interface TurnCredentials {
  urls: string
  username: string
  credential: string
  ttl: number
  fetchedAt: number
}

let cachedCredentials: TurnCredentials | null = null

/** 동적 TURN 크리덴셜 fetch — TTL 1시간 전에 자동 갱신 */
async function fetchTurnCredentials(authToken: string): Promise<RTCIceServer[]> {
  const REFRESH_BEFORE_EXPIRY_MS = 3600 * 1000 // 1시간 전 갱신

  const now = Date.now()
  const isStale =
    !cachedCredentials ||
    now > cachedCredentials.fetchedAt + (cachedCredentials.ttl * 1000 - REFRESH_BEFORE_EXPIRY_MS)

  if (isStale) {
    try {
      const res = await fetch('/api/webrtc/turn-credentials', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (res.ok) {
        const data = await res.json() as TurnCredentials
        cachedCredentials = { ...data, fetchedAt: now }
      }
    } catch {
      // 실패 시 기존 캐시 유지 또는 STUN만 사용
    }
  }

  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  if (cachedCredentials) {
    servers.push({
      urls: cachedCredentials.urls,
      username: cachedCredentials.username,
      credential: cachedCredentials.credential,
    })
  }

  return servers
}

export async function createPeerConnectionWithFallback(
  callbacks: FallbackCallbacks,
  authToken: string,
): Promise<RTCPeerConnection> {
  const iceServers = await fetchTurnCredentials(authToken)
  const pc = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  })

  let retryCount = 0
  const MAX_RETRIES = 1

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState

    if (state === 'failed') {
      if (retryCount < MAX_RETRIES) {
        retryCount++
        // ICE restart: attempt TURN fallback
        pc.restartIce()
        setTimeout(() => {
          if (pc.iceConnectionState === 'failed') {
            // TURN also failed — degrade to chat-only
            callbacks.onModeChange('chat-only')
          }
        }, 5000)
      } else {
        callbacks.onModeChange('failed')
      }
    } else if (state === 'disconnected') {
      // Transient disconnect — wait before acting
      setTimeout(() => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          callbacks.onModeChange('chat-only')
        }
      }, 8000)
    } else if (state === 'connected') {
      retryCount = 0
      callbacks.onModeChange('video')
    }
  }

  return pc
}

export function getConnectionQualityLabel(state: RTCIceConnectionState): string {
  switch (state) {
    case 'connected':
    case 'completed': return 'good'
    case 'checking': return 'connecting'
    case 'disconnected': return 'unstable'
    case 'failed': return 'failed'
    default: return 'unknown'
  }
}
