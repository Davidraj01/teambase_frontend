// TeamBase service worker — handles Web Push (VAPID) notifications.
// This is the ONLY service worker registered by the app (single scope owner).

// Activate the new worker immediately instead of waiting for old tabs to close.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Take control of any already-open pages right away.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fired by the browser when a push message arrives — including while the
// site/tab is closed, as long as the OS/browser has the SW registered.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TeamBase', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'TeamBase';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined,
    renotify: !!data.tag,
  };

  // event.waitUntil keeps the service worker alive long enough to actually
  // show the notification — without this, the SW can be killed mid-flight
  // and the notification silently never appears (a common cause of
  // "no notification when the site is closed").
  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an existing tab if one is open, otherwise open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  const openClient = async (client) => {
    if ('focus' in client) client.focus();
    if ('navigate' in client) {
      await client.navigate(url);
    }
    client.postMessage({ type: 'PUSH_NOTIFICATION_CLICK', url });
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && 'focus' in client) {
          await openClient(client);
          return;
        }
      }
      if (self.clients.openWindow) {
        const newClient = await self.clients.openWindow(url);
        if (newClient) await openClient(newClient);
      }
    })
  );
});

// If the browser rotates the push subscription under us, the old one goes
// stale silently. Re-subscribe and tell the running app about it so it can
// re-register with the backend.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true })
      .then((subscription) =>
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription }));
        })
      )
      .catch((err) => console.error('Push resubscribe failed', err))
  );
});
