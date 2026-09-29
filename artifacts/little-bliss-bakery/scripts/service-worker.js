/* Service worker source for the Little Bliss offline build.
   __PRECACHE__ and __VERSION__ are substituted by scripts/sw-plugin.js at build time. */

export function renderServiceWorker(precacheUrls, version) {
  return String.raw`
const VERSION = '__VERSION__';
const PRECACHE = 'lb-precache-' + VERSION;
const RUNTIME = 'lb-runtime-' + VERSION;
const SHELL = '/index.html';
const PRECACHE_URLS = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.indexOf('lb-') === 0 && key !== PRECACHE && key !== RUNTIME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // App shell: try the network so a fresh deploy is picked up, and keep the
  // cached copy in step with it so an offline reload still resolves.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PRECACHE).then((cache) => cache.put(SHELL, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(SHELL, { ignoreSearch: true }))
    );
    return;
  }

  // Same-origin only: the app is fully self-contained. Anything else is left
  // to the network untouched.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const cacheable = response && (response.type === 'basic' || response.type === 'cors' || response.type === 'opaque');
        if (cacheable && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
`.replace('__PRECACHE__', JSON.stringify(precacheUrls, null, 2)).replace('__VERSION__', version);
}
