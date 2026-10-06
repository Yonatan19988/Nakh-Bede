// نخ بده — offline support
const CACHE = 'nakh-bede-v9';
const CORE = [
  './', './index.html',
  './css/styles.css',
  './js/data.js', './js/app.js', './js/firebase.js',
  './assets/map.webp', './assets/logo.webp',
  './assets/card-back.webp', './assets/card-word.webp', './assets/card-action.webp',
  './manifest.webmanifest',
  './icons/icon-96.png', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // one missing file must not fail the whole install
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache for an instant start, refresh in the background so the next
// launch picks up whatever was published since.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Firebase and fonts stay online

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const live = fetch(req)
          .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
          .catch(() => hit || cache.match('./index.html'));
        return hit || live;
      })
    )
  );
});
