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

// Stamp the same version into the (verbatim-copied) service worker so each deploy
// gets a fresh cache namespace and old caches are evicted on activate.
function stampServiceWorker() {
  return {
    name: 'zw-stamp-sw',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist', 'sw.js');
      if (!existsSync(swPath)) return;
      let src = readFileSync(swPath, 'utf8');
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
export default defineConfig({
  base: './',
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
  },
  server: {
    open: true,
    port: 5173,
    host: true,
  },
});
