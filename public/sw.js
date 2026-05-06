const CACHE_NAME = 'teenz-chatroom-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Network first strategy - always get fresh content
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET') {
            cache.put(event.request, responseClone)
          }
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})

// Tell all clients to reload when new version available
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
