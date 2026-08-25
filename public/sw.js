self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const hasFocusedSameOrigin = windows.some(
        (client) =>
          client.focused &&
          client.visibilityState === 'visible' &&
          new URL(client.url).origin === self.location.origin,
      );
      if (hasFocusedSameOrigin) return;
      await self.registration.showNotification(data.title || 'TUF', {
        body: data.body || '',
        icon: data.icon || '/favicon.ico',
        image: data.image || undefined,
        data: {
          href: data.href || '/notifications',
          notificationId: data.notificationId,
        },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.href || '/notifications';
  const url = new URL(target, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(url);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
