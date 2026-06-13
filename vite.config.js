import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Vite config for Zaylin's World.
// - `base: './'` keeps asset URLs relative so the build works on GitHub Pages
//   project subpaths (https://user.github.io/repo/) AND Cloudflare Pages.
// - The `three/addons/*` alias maps the examples/jsm helpers (Sky, GLTFLoader,
//   DRACOLoader, KTX2Loader, RGBELoader, meshopt) to the installed npm package,
//   replacing the old CDN import map so everything bundles & tree-shakes.
export default defineConfig({
  base: './',
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
