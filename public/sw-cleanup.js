// Wird vom Workbox-Service-Worker per importScripts geladen.
const CACHE_PREFIX = 'takt-v2'

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k))),
      ),
  )
})
