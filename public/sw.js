// CINDERBLOCK Service Worker for Push Notifications
const SW_VERSION = '1.0.0';

self.addEventListener('message', function(event) {
  if (!event.data) return;
  // Only reply if the caller passed a MessageChannel port
  var port = event.ports && event.ports[0];
  if (!port) return;
  if (event.data.type === 'PING') {
    port.postMessage({ type: 'PONG', version: SW_VERSION });
  }
  if (event.data.type === 'GET_STATUS') {
    port.postMessage({ type: 'STATUS', version: SW_VERSION, state: 'active' });
  }
});

self.addEventListener('push', function(event) {
  console.log('[SW] Push received');

  var title = 'CINDERBLOCK';
  var options = {
    body: 'New notification received',
    icon: '/icons/icon-192x192.png',
    tag: 'cinderblock-notification',
    renotify: true,
    data: { dateOfArrival: Date.now(), url: '/' }
  };

  if (event.data) {
    try {
      var payload = event.data.json();
      if (payload.title) {
        title = payload.title;
        delete payload.title;
      }
      options = Object.assign({}, options, payload);
    } catch (e) {
      options.body = event.data.text() || 'New notification from CINDERBLOCK';
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  var urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('install', function(event) {
  console.log('[SW] Installing version:', SW_VERSION);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating version:', SW_VERSION);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName.startsWith('cinderblock-') && cacheName !== 'cinderblock-' + SW_VERSION) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('error', function(event) {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('[SW] Unhandled rejection:', event.reason);
});
