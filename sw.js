// Hassan Mobile - Service Worker
// Purpose: makes the app installable (PWA install criteria on Android/Chrome
// require a registered service worker) and gives a basic offline fallback
// for the app shell. It does NOT cache Firestore data - that still needs
// a live internet connection.

const CACHE_NAME = 'hassan-mobile-shell-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for the app shell (so updates show up quickly),
// falling back to cache when offline. Firestore/API calls are left
// untouched (browser handles them normally; if offline they'll just fail
// as before - the app itself already shows connection state to the user).
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests for our own shell files
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
