// FlashJam Service Worker — Background Notifications
const VERSION = 'flashjam-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// ── Handle notification click ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Otherwise open the app
      return self.clients.openWindow('./');
    })
  );
});

// ── Listen for messages from the main app ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, icon, tag } = e.data;
    setTimeout(() => {
      // Check quiet hours before firing
      const now = new Date();
      const hour = now.getHours();
      const quietStart = e.data.quietStart || 22;
      const quietEnd = e.data.quietEnd || 8;
      let isQuiet = false;
      if (quietStart > quietEnd) {
        isQuiet = hour >= quietStart || hour < quietEnd;
      } else {
        isQuiet = hour >= quietStart && hour < quietEnd;
      }
      if (!isQuiet) {
        self.registration.showNotification(title || '⚡ FlashJam Reminder!', {
          body: body || 'Time to study your flashcards!',
          icon: icon || './icon.png',
          badge: './icon.png',
          tag: tag || 'flashjam-reminder',
          renotify: true,
          vibrate: [200, 100, 200, 100, 400],
          requireInteraction: false,
          actions: [
            { action: 'open', title: '📖 Study Now' },
            { action: 'dismiss', title: 'Later' }
          ]
        });
      }
    }, delay || 0);
  }

  if (e.data && e.data.type === 'CANCEL_NOTIFICATIONS') {
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(n => n.close());
    });
  }
});

// ── Fetch handler (serve cached files offline) ──
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
