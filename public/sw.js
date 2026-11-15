/* ================================================================
   sw.js — TKJ XII-9 | Service Worker (PWA Offline Cache)
   - Network-first untuk navigasi HTML
   - Cache-first untuk aset statis
   - Tidak mencache admin/API
   - Batas cache aset untuk mencegah pertumbuhan tanpa batas
   ================================================================ */
'use strict';

const CACHE_PREFIX = 'tkj-xii9-';
const CACHE_NAME = 'tkj-xii9-v7';
const OFFLINE_URL = '/offline';
const MAX_STATIC_CACHE_ENTRIES = 120;

const PRECACHE_ASSETS = [
  '/',
  OFFLINE_URL,
];

async function trimStaticCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length <= MAX_STATIC_CACHE_ENTRIES) return;
  const excess = keys.length - MAX_STATIC_CACHE_ENTRIES;
  await Promise.all(keys.slice(0, excess).map((request) => cache.delete(request)));
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS).catch(err => {
      console.warn('[SW] Precache gagal (sebagian):', err);
    }))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME ? caches.delete(key) : undefined)
    )).then(trimStaticCache)
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Jangan intersep dashboard admin atau endpoint API. Keduanya harus selalu live.
  if (url.pathname.startsWith('/pengembang/admin') || url.pathname.startsWith('/api/')) return;

  // Preview memakai cookie admin dan query tersendiri. Jangan pernah memasukkannya ke Cache API,
  // termasuk fallback offline, karena Cache API tidak menjadikan Cookie sebagai bagian cache key.
  if (url.searchParams.has('previewDraft')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const cacheDirectives = [
            res.headers.get('Cache-Control') || '',
            res.headers.get('CDN-Cache-Control') || '',
            res.headers.get('Cloudflare-CDN-Cache-Control') || '',
            res.headers.get('Surrogate-Control') || '',
          ].join(',');
          const vary = res.headers.get('Vary') || '';
          const robots = res.headers.get('X-Robots-Tag') || '';
          const isPrivateResponse =
            /(?:^|,)\s*(?:private|no-store|no-cache)(?:\s|,|$)/i.test(cacheDirectives) ||
            /(?:^|,)\s*cookie\s*(?:,|$)/i.test(vary) ||
            /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(robots);
          // Never cache redirects, partial content, or responses that vary by credentials.
          if (res.status === 200 && !res.redirected && !isPrivateResponse) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone).then(trimStaticCache));
          }
          return res;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone).then(trimStaticCache));
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
