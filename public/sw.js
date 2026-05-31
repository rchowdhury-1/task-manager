const CACHE_NAME = 'personal-os-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-mark.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Network-first for navigation, fall back to offline page
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match('/offline').then((r) => r || new Response('Offline', { status: 503 }))
    )
  );
});
