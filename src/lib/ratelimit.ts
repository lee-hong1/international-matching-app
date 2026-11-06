/**
 * Rate limiting — Upstash Redis (sliding window) with in-memory fallback.
 *
 * Windows:
 *   general   : 100 req / 60 s per IP
 *   payment   :   5 req / 60 s per IP
 *   shop_link :  20 req / 600 s per IP
 */

type Window = { max: number; windowMs: number }

export const WINDOWS = {
  general:   { max: 100, windowMs: 60_000 } as Window,
  payment:   { max: 5,   windowMs: 60_000 } as Window,
  shop_link: { max: 20,  windowMs: 600_000 } as Window,
} as const

export type WindowName = keyof typeof WINDOWS

// ── Upstash Redis client (lazy, skipped when env vars absent) ───────────────

let upstashReady: boolean | null = null

function isUpstashConfigured(): boolean {
  if (upstashReady !== null) return upstashReady
  upstashReady = !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  )
  return upstashReady
}

async function upstashSlidingWindow(
  key: string,
  { max, windowMs }: Window,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const now = Date.now()
  const windowSec = Math.floor(windowMs / 1000)

  // ZREMRANGEBYSCORE + ZADD + ZCARD + EXPIRE in a pipeline
  const pipeline = [
    ['zremrangebyscore', key, '-inf', now - windowMs],
    ['zadd', key, now, `${now}-${Math.random()}`],
    ['zcard', key],
    ['pexpire', key, windowMs],
  ]

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipeline),
  })

  if (!res.ok) throw new Error(`Upstash pipeline failed: ${res.status}`)

  const results = await res.json() as Array<{ result: unknown }>
  const count = results[2]?.result as number

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt: now + windowMs,
  }
}

// ── In-memory fallback (single-process only; resets on restart) ─────────────

type Bucket = { timestamps: number[] }
const memStore = new Map<string, Bucket>()

function memSlidingWindow(
  key: string,
  { max, windowMs }: Window,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const bucket = memStore.get(key) ?? { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter(t => t > now - windowMs)

  // 윈도우 만료 후 첫 접근: 빈 버킷을 Map에서 제거 → 메모리 누수 방지
  if (bucket.timestamps.length === 0) {
    memStore.delete(key)
  }

  bucket.timestamps.push(now)
  memStore.set(key, bucket)

  const count = bucket.timestamps.length
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt: now + windowMs,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(
  ip: string,
  window: WindowName,
): Promise<RateLimitResult> {
  const cfg = WINDOWS[window]
  const key = `rl:${window}:${ip}`

  if (isUpstashConfigured()) {
    try {
      return await upstashSlidingWindow(key, cfg)
    } catch {
      // fall through to memory on Upstash errors
    }
  }

  return memSlidingWindow(key, cfg)
}

/** Returns a 429 JSON response body with Retry-After headers. */
export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return {
    body: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요. / Too many requests. Please try again later.' },
    headers: {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Reset': String(resetAt),
    },
    status: 429 as const,
  }
}
