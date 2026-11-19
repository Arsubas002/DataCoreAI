const RELEASE = 'nova-2025-v7';
const CACHE = 'datacore-' + RELEASE;
const RUNTIME = './';
const documents = ['./', './index.html'];
const shell = ['./manifest.webmanifest', './icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png'];
const runtime = [
  './nova.css', './nova-shell.css', './nova-workspace.css', './nova-assistant.css',
  './js/app.js', './js/novaretail-data.js', './js/nova-chat.js', './js/nova-analysis.js', './js/icons.js',
  './assets/manrope-latin.woff2',
].map(file => RUNTIME + file.slice(2));
const href = file => new URL(file, self.registration.scope).href;
const documentPaths = new Set([...documents, './actualizada.html'].map(file => new URL(href(file)).pathname));
const assetUrls = new Set([...shell, ...runtime].map(href));

self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});

self.addEventListener('install', event => {
  // Keep the document and all of its offline assets together as one release.
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll([...documents, ...shell, ...runtime].map(file => new Request(href(file), { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('datacore-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

async function documentResponse(request) {
  try {
    return await fetch(request, { cache: 'no-cache' });
  } catch {
    const cache = await caches.open(CACHE);
    return await cache.match(href('./index.html')) ?? Response.error();
  }
}

async function assetResponse(request) {
  const cache = await caches.open(CACHE);
  return await cache.match(request) ?? fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate' && documentPaths.has(url.pathname)) {
    event.respondWith(documentResponse(request));
  } else if (assetUrls.has(url.href)) {
    event.respondWith(assetResponse(request));
  }
});
