const CACHE_NAME = 'ghostlink-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Network first for API/PeerJS, Cache fallback for assets
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});