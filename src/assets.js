// ───────────────────────────────────────────────────────────────────────────
//  assets.js — real glTF asset pipeline + HDRI image-based lighting.
//  * GLTFLoader with Draco + meshopt decompression for optimized .glb/.gltf
//  * KTX2 (Basis) compressed-texture support when a transcoder is present
//  * RGBE HDRI environment loading with graceful fallback to a procedural sky
//  * content-addressed Cloudflare R2 resolution with transparent local fallback
//  * a small async cache + skinned-animation helper (AnimationMixer)
//
//  Local development continues to work with /public/assets. Production builds
//  may set VITE_ASSET_BASE_URL to an R2 custom domain. The compact remote asset
//  manifest maps familiar local paths to immutable SHA-256 object keys.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/';
const ENV_ASSET_BASE_URL = String(import.meta.env.VITE_ASSET_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');
const REMOTE_MANIFEST_URL = './assets/remote-asset-manifest.json';

let _gltf = null;
let _ktx2 = null;
let _ktxRenderer = null;
function gltfLoader(renderer) {
  if (!_gltf) {
    const draco = new DRACOLoader().setDecoderPath(CDN + 'draco/');
    _ktx2 = new KTX2Loader().setTranscoderPath(CDN + 'basis/');
    _gltf = new GLTFLoader()
      .setDRACOLoader(draco)
      .setKTX2Loader(_ktx2)
      .setMeshoptDecoder(MeshoptDecoder);
  }
  // NPC loading may initialize the shared loader before the player path has a
  // renderer. Detect KTX2 support as soon as any later caller supplies one.
  if (renderer && _ktx2 && _ktxRenderer !== renderer) {
    try {
      _ktx2.detectSupport(renderer);
      _ktxRenderer = renderer;
    } catch (error) {
      console.warn('[assets] KTX2 renderer detection failed; normal textures still work', error);
    }
  }
  return _gltf;
}

function isAbsoluteUrl(value) {
  return /^(?:https?:|data:|blob:)/i.test(String(value || ''));
}

function normalizePublicAssetPath(value) {
  const normalized = String(value || '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
  return normalized.startsWith('assets/') ? normalized : `assets/${normalized}`;
}

let _remoteManifestPromise = null;
async function loadRemoteAssetManifest() {
  if (_remoteManifestPromise) return _remoteManifestPromise;
  _remoteManifestPromise = fetch(REMOTE_MANIFEST_URL, { cache: 'no-cache' })
    .then((response) => (response.ok ? response.json() : null))
    .then((manifest) => (manifest && typeof manifest === 'object' ? manifest : { assets: {} }))
    .catch(() => ({ assets: {} }));
  return _remoteManifestPromise;
}

// Resolve a familiar local public path to a content-addressed R2 object when a
// synchronized manifest and asset base URL are available. Missing mappings,
// local development, or a temporarily unavailable manifest all fall back to
// the original URL without changing callers.
export async function resolveAssetUrl(url) {
  if (!url || isAbsoluteUrl(url)) return url;
  const publicPath = normalizePublicAssetPath(url);
  const manifest = await loadRemoteAssetManifest();
  const entry = manifest.assets?.[publicPath];
  const baseUrl = ENV_ASSET_BASE_URL || String(manifest.baseUrl || '').replace(/\/+$/, '');
  if (entry?.key && baseUrl) return `${baseUrl}/${String(entry.key).replace(/^\/+/, '')}`;
  return url;
}

const _modelCache = new Map();

// Load a .glb/.gltf. Returns { scene, animations } or null if it can't load.
// Never throws — callers fall back to procedural meshes.
export async function loadModel(url, renderer) {
  const resolvedUrl = await resolveAssetUrl(url);
  if (_modelCache.has(resolvedUrl)) {
    // Upgrade the singleton KTX2 loader if this cached call is the first one that
    // knows about the renderer.
    gltfLoader(renderer);
    return _modelCache.get(resolvedUrl);
  }
  const p = new Promise((resolve) => {
    gltfLoader(renderer).load(
      resolvedUrl,
      (gltf) => {
        gltf.scene.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.receiveShadow = true;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const material of mats) {
            if (material) material.envMapIntensity = 1.0;
          }
        });
        resolve({ scene: gltf.scene, animations: gltf.animations || [] });
      },
      undefined,
      () => resolve(null),   // 404 / decode error → procedural fallback
    );
  });
  _modelCache.set(resolvedUrl, p);
  return p;
}

// Build an AnimationMixer + named-clip map for a loaded model.
export function makeMixer(root, animations) {
  const mixer = new THREE.AnimationMixer(root);
  const clips = {};
  const clipNames = [];
  for (const clip of animations) {
    clips[clip.name.toLowerCase()] = clip;
    clipNames.push(clip.name);
  }
  return {
    mixer,
    actions: {},
    clipNames,
    play(name, { fade = 0.25, loop = true } = {}) {
      const clip = clips[String(name).toLowerCase()];
      if (!clip) return null;
      let act = this.actions[name];
      if (!act) { act = mixer.clipAction(clip); this.actions[name] = act; }
      act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      act.reset().fadeIn(fade).play();
      return act;
    },
    stop(name, fade = 0.2) { this.actions[name]?.fadeOut(fade); },
    update(dt) { mixer.update(dt); },
  };
}

// Image-based lighting: load a real CC0 HDRI for reflections + ambient light.
// Resolves to the equirect/PMREM env texture, or null on failure (use sky).
export async function loadHDRI(renderer, url, manager) {
  const resolvedUrl = await resolveAssetUrl(url);
  return new Promise((resolve) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader(manager).load(
      resolvedUrl,
      (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const env = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        resolve(env);
      },
      undefined,
      () => resolve(null),
    );
  });
}

// Load the asset manifest (slots → model URLs). Empty/missing is fine.
export async function loadManifest(url = './assets/manifest.json') {
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// ── Imported asset kits (Kenney Retro Urban Kit + mini characters) ──────────
// kits-index.json is generated by tools/index-kits.mjs and lists every model
// per kit with its served URL. Returns {} if missing so callers can no-op.
let _kitsIndex = null;
export async function loadKitsIndex(url = './assets/models/kits-index.json') {
  if (_kitsIndex) return _kitsIndex;
  try {
    const res = await fetch(url);
    _kitsIndex = res.ok ? await res.json() : { kits: {} };
  } catch {
    _kitsIndex = { kits: {} };
  }
  return _kitsIndex;
}

// Load one model from a kit by name (e.g. loadKitModel('urban-kit','Building_Small_1')).
// Returns { scene, animations } or null (caller falls back to procedural).
export async function loadKitModel(kitId, name, renderer) {
  const idx = await loadKitsIndex();
  const kit = idx.kits?.[kitId];
  if (!kit) return null;
  const entry = kit.models.find((m) => m.name === name);
  if (!entry) return null;
  return loadModel('./' + entry.url, renderer);
}

// ── Organized asset library (tools/organize-assets.mjs → asset-index-v2.json) ─
// Catalogs every uploaded pack converted to web-ready glTF/GLB, grouped as
// index[category][packSlug] = [{ name, path, type, tex }]. This is the single
// lookup the game uses to pull real furniture, food, characters, weapons,
// building, and animation assets into live scenes.
let _assetLib = null;
export async function loadAssetLibrary(url = './assets/models/asset-index-v2.json') {
  if (_assetLib) return _assetLib;
  try {
    const res = await fetch(url);
    _assetLib = res.ok ? await res.json() : {};
  } catch {
    _assetLib = {};
  }
  return _assetLib;
}

// List entries in a category/pack, e.g. listAssets('interiors','furniture').
export async function listAssets(category, pack) {
  const lib = await loadAssetLibrary();
  const cat = lib[category] || {};
  if (pack) return cat[pack] || [];
  return Object.values(cat).flat();
}

// Find an asset entry by (category, pack, name). Exact case-insensitive matches
// win; substring lookup remains as a compatibility fallback for older callers.
export async function findAsset(category, pack, nameLike) {
  const list = await listAssets(category, pack);
  if (!nameLike) return list[0] || null;
  const q = String(nameLike).toLowerCase();
  return list.find((e) => String(e.name).toLowerCase() === q)
    || list.find((e) => String(e.name).toLowerCase().includes(q))
    || null;
}

// Load an asset directly from the library by (category, pack, name).
// Returns { scene, animations } or null (caller falls back to procedural).
export async function loadAsset(category, pack, nameLike, renderer) {
  const entry = await findAsset(category, pack, nameLike);
  if (!entry) return null;
  return loadModel('./assets/' + entry.path, renderer);
}
