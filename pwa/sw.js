const CACHE = 'datacore-orbit-spectrum-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/app.js',
  './js/data.js',
  './js/icons.js',
  './js/charts.js',
  './js/motion.js',
  './js/assistant.js',
  './manifest.webmanifest',
  './icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
];
self.addEventListener('message', (event) => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('datacore-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // API data and credentials must never enter the offline cache.
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return;
  if (
    !ASSETS.some(
      (asset) =>
        new URL(asset, self.registration.scope).pathname === url.pathname,
    )
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        return await fetch(event.request);
      } catch {
        return event.request.mode === 'navigate'
          ? cache.match('./index.html')
          : Response.error();
      }
    }),
  );
});
