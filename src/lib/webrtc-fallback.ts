export type WebRTCMode = 'video' | 'chat-only' | 'failed'

export interface FallbackCallbacks {
  onModeChange: (mode: WebRTCMode) => void
  onRetry: () => void
}

function getTurnServers(): RTCIceServer[] {
  const url = process.env.NEXT_PUBLIC_TURN_SERVER_URL
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL

  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  if (url && username && credential) {
    servers.push({ urls: url, username, credential })
  }

  return servers
}

export function createPeerConnectionWithFallback(
  callbacks: FallbackCallbacks
): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers: getTurnServers(),
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
