// Self-destructive Service Worker to immediately purge cache and fix domain loading issues
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('Purging cache key:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      console.log('Caches purged. Service worker unregistering...');
      return self.registration.unregister();
    })
  );
});

