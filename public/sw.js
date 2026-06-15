// ───────────────────────────────────────────────────────────────────────────
//  sw.js — service worker for Zaylin's World.
//
//  VERSION is stamped at build time (vite.config.js → stampServiceWorker) with
//  the package version + git commit, so EVERY deploy gets a fresh cache
//  namespace and the old caches are deleted on activate. No more "stuck on an
//  old build" — a new deploy always wins.
//
//  Strategy:
//   • App shell (html/js/css) → network-first (always try the fresh build,
//     fall back to cache only when offline).
//   • Models / textures / HDRI (.glb,.gltf,.bin,.png,…) → stale-while-revalidate
//     so a cached copy loads instantly BUT a newer asset is fetched in the
//     background and used next time (updated assets are never stuck).
//   • Messages: SKIP_WAITING (activate the new SW now), CLEAR_CACHES (force
//     wipe — the in-game "force update" debug button), GET_VERSION.
// ───────────────────────────────────────────────────────────────────────────
const VERSION = '__SW_VERSION__';           // replaced at build with e.g. 1.0.0+abc1234
const SHELL_CACHE = `zw-${VERSION}-shell`;
const ASSET_CACHE = `zw-${VERSION}-assets`;

const ASSET_RE = /\.(glb|gltf|ktx2|basis|hdr|exr|png|jpe?g|webp|bin|woff2?)$/i;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // delete every cache that isn't from THIS version
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  const type = e.data && e.data.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'CLEAR_CACHES') {
    e.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: 'CACHES_CLEARED' }));
    })());
  }
  if (type === 'GET_VERSION') {
    e.source && e.source.postMessage({ type: 'SW_VERSION', version: VERSION });
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  const isAsset = ASSET_RE.test(url.pathname);
  if (isAsset) {
    e.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
  } else if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(req, SHELL_CACHE));
  }
});

// Network-first: always try the network so a fresh deploy is picked up; fall
// back to the cached shell only when offline.
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req);
    return hit || Response.error();
  }
}

// Stale-while-revalidate: serve cached copy instantly, but refresh in the
// background so updated assets are used on the next load (never stuck).
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetchPromise;
}
