// ───────────────────────────────────────────────────────────────────────────
//  sw.js — service worker: cache-first for static assets so repeat loads are
//  fast and the game keeps working offline after the first visit.
//
//  Strategy:
//   • App shell (html/js/css) → stale-while-revalidate.
//   • Models / textures / HDRI (.glb,.gltf,.ktx2,.hdr,.png,.jpg,.webp,.bin)
//     → cache-first (immutable, big — never refetch once cached).
//   • Everything else → network with cache fallback.
// ───────────────────────────────────────────────────────────────────────────
const VERSION = 'zw-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

const ASSET_RE = /\.(glb|gltf|ktx2|basis|hdr|exr|png|jpe?g|webp|bin|woff2?)$/i;

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Don't cache cross-origin opaque APIs; do cache CDN assets that match.
  const isAsset = ASSET_RE.test(url.pathname);

  if (isAsset) {
    e.respondWith(cacheFirst(req, ASSET_CACHE));
  } else if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || fetchPromise;
}
