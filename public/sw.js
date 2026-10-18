// ───────────────────────────────────────────────────────────────────────────
//  sw.js — service worker for Zaylin's World.
//
//  The app shell is versioned per build, but large GLB/texture caches survive
//  asset-factory commits. Asset requests use stale-while-revalidate so updated
//  models still arrive without redownloading the whole world after each deploy.
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
// Intentionally stable across app builds: generated asset batches commit often.
// Bump only when the asset caching policy itself needs a clean migration.
const ASSET_CACHE = 'zw-assets-v2';

const ASSET_RE = /\.(glb|gltf|ktx2|basis|hdr|exr|png|jpe?g|webp|bin|woff2?)$/i;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Retire only caches owned by Zaylins. Preserve the shared asset cache
    // across frequent deploys; never delete another site's origin-wide caches.
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('zw-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
        .map((k) => caches.delete(k)),
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
    e.respondWith(staleWhileRevalidate(req, ASSET_CACHE, e));
  } else if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(req, SHELL_CACHE, e));
  }
});

// Network-first: always try the network so a fresh deploy is picked up; fall
// back to the cached shell only when offline.
async function networkFirst(req, cacheName, event) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      // Never delay the first paint for a disk write or reject the response
      // when browser storage is full.
      event.waitUntil(cache.put(req, res.clone()).catch(() => {}));
    }
    return res;
  } catch {
    const hit = await cache.match(req);
    return hit || Response.error();
  }
}

// Stale-while-revalidate: serve cached copy instantly, but refresh in the
// background so updated assets are used on the next load (never stuck).
async function staleWhileRevalidate(req, cacheName, event) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then(async (res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        try { await cache.put(req, res.clone()); }
        catch { /* Cache quota is optional: gameplay should still load. */ }
      }
      return res;
    })
    .catch(() => hit || Response.error());
  // Cached content returns instantly. waitUntil allows the background update
  // to finish even after the fetch response is resolved by the worker.
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return refresh;
}
