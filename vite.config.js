import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── build identity ───────────────────────────────────────────────────────────
// Stamp the exact git commit + build time into the bundle so the live game can
// prove which deploy it is running (see src/debug.js). If git isn't available
// (e.g. a tarball deploy) we fall back to the timestamp.
function gitCommit() {
  try { return execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim(); }
  catch { return 'nogit'; }
}
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
const BUILD_COMMIT = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) || gitCommit();
const BUILD_TIME = new Date().toISOString();
const APP_VERSION = `${pkg.version}+${BUILD_COMMIT}`;

// Emit and stamp the service worker from its tracked source so every build path
// gets the same cache identity. GitHub Pages deliberately disables Vite's broad
// publicDir copy and assembles a bounded asset pack afterward; relying on a later
// workflow `cp` used to overwrite/miss the stamped worker. The git fallback also
// keeps sparse engineering checkouts honest when public/sw.js is not materialized.
function readServiceWorkerSource() {
  const sourcePath = resolve(__dirname, 'public', 'sw.js');
  if (existsSync(sourcePath)) return readFileSync(sourcePath, 'utf8');
  try { return execSync('git show HEAD:public/sw.js', { cwd: __dirname }).toString(); }
  catch { return null; }
}

function stampServiceWorker() {
  return {
    name: 'zw-stamp-sw',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist', 'sw.js');
      let src = readServiceWorkerSource();
      if (!src && existsSync(swPath)) src = readFileSync(swPath, 'utf8');
      if (!src) throw new Error('Unable to emit service worker: public/sw.js is unavailable');
      if (!src.includes('__SW_VERSION__')) throw new Error('Service worker source is missing its version token');
      src = src.replace(/__SW_VERSION__/g, APP_VERSION);
      writeFileSync(swPath, src);
    },
  };
}

// Vite config for Zaylin's World.
// - `base: './'` keeps asset URLs relative so the build works on GitHub Pages
//   project subpaths (https://user.github.io/repo/) AND Cloudflare Pages.
// - The `three/addons/*` alias maps the examples/jsm helpers (Sky, GLTFLoader,
//   DRACOLoader, KTX2Loader, RGBELoader, meshopt) to the installed npm package,
//   replacing the old CDN import map so everything bundles & tree-shakes.
// - The second HTML entry is an isolated large-town engineering preview. It does
//   not touch the normal player save or replace the main game entry.
export default defineConfig({
  base: './',
  // GitHub Pages receives a deliberately bounded Starter Town runtime pack.
  // Copying every in-production town asset makes the deployment artifact
  // unnecessarily large and can leave Pages serving HTML before its bundles.
  publicDir: process.env.ZTA_PAGES_DEPLOYMENT === '1' ? false : 'public',
  define: {
    __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [stampServiceWorker()],
  resolve: {
    alias: [
      {
        find: /^three\/addons\//,
        replacement: resolve(__dirname, 'node_modules/three/examples/jsm') + '/',
      },
    ],
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        game: resolve(__dirname, 'index.html'),
        starterTownPreview: resolve(__dirname, 'large-town-preview.html'),
      },
    },
  },
  server: {
    open: true,
    port: 5173,
    host: true,
  },
});
