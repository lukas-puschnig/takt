/* Wird vom generierten Service Worker per importScripts geladen (siehe vite.config.ts).
   Tippen auf eine Takt-Benachrichtigung holt die App nach vorn bzw. öffnet sie. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url ?? './#/fokus', self.registration.scope)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          await client.focus()
          client.postMessage({ type: 'takt:navigate', hash: target.hash })
          return
        }
      }
      await self.clients.openWindow(target.href)
    })(),
  )
})
