// نخ بده — offline support
const CACHE = 'nakh-bede-v32';
// The board image is large; it is fetched after install, in the background, so it
// never competes with the first screen. (It is also cached the first time it is used.)
const LAZY = ['./assets/map-60.webp'];
const FONT_CACHE = 'nakh-bede-fonts-v1';
const CORE = [
  './', './index.html',
  './css/styles.css',
  './js/data.js', './js/app.js', './js/firebase.js',
  './assets/logo.webp',
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
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => {
        caches.open(CACHE).then((c) => Promise.allSettled(LAZY.map((u) => c.add(new Request(u, { cache: 'reload' })))));
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache for an instant start, refresh in the background so the next
// launch picks up whatever was published since.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Google Fonts: keep a copy so the real typeface shows even on a weak connection
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const live = fetch(req)
            .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
            .catch(() => hit);
          return hit || live;
        })
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return;   // Firebase stays online

  // Code and pages: ask the network first (bypassing the HTTP cache) so a new
  // version shows up on the very next open; fall back to the stored copy when
  // offline or slow. Images and other assets stay cache-first.
  const isCode = req.mode === 'navigate' || /\.(?:js|css|html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isCode) {
    e.respondWith(
      caches.open(CACHE).then((cache) => {
        const live = fetch(req, { cache: 'no-cache' }).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        });
        const timeout = new Promise((_, rej) => setTimeout(rej, 4000));
        return Promise.race([live, timeout]).catch(() =>
          cache.match(req, { ignoreSearch: true }).then((hit) => hit || live.catch(() => cache.match('./index.html')))
        );
      })
    );
    return;
  }

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
