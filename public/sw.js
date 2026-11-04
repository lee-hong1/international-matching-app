// GlobalMatch Service Worker — Cache First (static) / Network First (API)
const CACHE_NAME = 'globalmatch-v1'
const STATIC_ASSETS = ['/', '/offline.html', '/manifest.json']

// ── Install: pre-cache static assets ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

// ── Activate: clean up old caches ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

// ── Fetch: routing strategy ───────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 외부 origin 요청은 패스스루 (캐시 없음)
  if (url.origin !== self.location.origin) return

  // API 라우트: Network First, 실패 시 오프라인 응답
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline', message: '네트워크 연결을 확인해주세요.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    return
  }

  // 정적 자산(_next/static): Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    )
    return
  }

  // 페이지 내비게이션: Network First, 실패 시 /offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline.html').then((r) => r ?? Response.error()),
      ),
    )
    return
  }

  // 기타: Network First
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})
