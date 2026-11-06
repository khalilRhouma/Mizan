/* Service worker (built by vite-plugin-pwa, "injectManifest" strategy).
 *
 * 1. Precache the app files: the app opens even when the server is off.
 * 2. GET /api/*: network first, cached copy when offline (last data seen).
 * 3. Saves (POST /api/transactions, /api/category-rules/learn): if the server
 *    cannot be reached, keep the request on the phone (Workbox Background Sync
 *    queue, kept 30 days) and answer 202 {queued: true}. The queue is sent when
 *    the phone is online again, when the app opens, or with "Send now".
 */
import { Queue } from 'workbox-background-sync'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Single-page app: every page URL serves index.html (not the API).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }))

const API_CACHE = 'mizan-api-get'

// A 5xx answer (API down behind nginx / the dev proxy) must count as "no
// network", so NetworkFirst falls back to the cached copy.
const treatServerErrorsAsOffline = {
  fetchDidSucceed: async ({ response }) => {
    if (response.status >= 500) throw new Error(`server error ${response.status}`)
    return response
  },
}

registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 4,
    plugins: [treatServerErrorsAsOffline, new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 })],
  }),
)

// The first visit loads data before the service worker is active, so fill the
// cache once now: the app can then open offline right away.
const WARM_URLS = ['/api/categories', '/api/settings', '/api/transactions', '/api/debts', '/api/monthly-funds']
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open(API_CACHE).then((cache) =>
      Promise.all(
        WARM_URLS.map((url) =>
          fetch(url)
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      ),
    ),
  )
})

// --- offline queue for saves -------------------------------------------------

const QUEUED_PATHS = new Set(['/api/transactions', '/api/category-rules/learn'])

/** 5xx (e.g. 502 from nginx when the API is down): keep the save and retry.
 * Safer than dropping it; the "waiting" badge shows it until it is sent. */
function serverUnreachable(response) {
  return response.status >= 500
}

async function broadcastPending() {
  const count = (await queue.getAll()).length
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) client.postMessage({ type: 'MIZAN_PENDING', count })
  return count
}

async function replayQueue() {
  let entry
  let sent = 0
  while ((entry = await queue.shiftRequest())) {
    try {
      const response = await fetch(entry.request.clone())
      if (serverUnreachable(response)) throw new Error('server unreachable')
      // 2xx: done. 4xx (e.g. 422 invalid): retrying will not help, drop it.
      sent += 1
    } catch (error) {
      await queue.unshiftRequest(entry)
      await broadcastPending()
      throw error
    }
  }
  await broadcastPending()
  return sent
}

const queue = new Queue('mizan-saves', {
  maxRetentionTime: 30 * 24 * 60, // minutes
  onSync: async () => {
    await replayQueue()
  },
})

registerRoute(
  ({ url, request }) => request.method === 'POST' && QUEUED_PATHS.has(url.pathname),
  async ({ request }) => {
    try {
      const response = await fetch(request.clone())
      if (!serverUnreachable(response)) return response
    } catch {
      /* network error: the Mac is off or the phone is offline */
    }
    await queue.pushRequest({ request })
    await broadcastPending()
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json', 'X-Mizan-Queued': '1' },
    })
  },
  'POST',
)

// Messages from the page: ask the pending count, or try to send now.
self.addEventListener('message', (event) => {
  const type = event.data?.type
  if (type === 'MIZAN_PENDING') event.waitUntil(broadcastPending())
  if (type === 'MIZAN_SYNC') event.waitUntil(replayQueue().catch(() => broadcastPending()))
})
