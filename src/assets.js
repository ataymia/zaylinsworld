// ───────────────────────────────────────────────────────────────────────────
//  assets.js — real glTF asset pipeline + HDRI image-based lighting.
//  * GLTFLoader with Draco + meshopt decompression for optimized .glb/.gltf
//  * KTX2 (Basis) compressed-texture support when a transcoder is present
//  * RGBE HDRI environment loading with graceful fallback to a procedural sky
//  * a small async cache + skinned-animation helper (AnimationMixer)
//
//  Drop properly-licensed (CC0 / commercial-use / original) .glb files into
//  /assets and reference them from /assets/manifest.json — they load here with
//  PBR materials, shadows, and animations, no code changes required.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/';

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

const _modelCache = new Map();

// Load a .glb/.gltf. Returns { scene, animations } or null if it can't load.
// Never throws — callers fall back to procedural meshes.
export async function loadModel(url, renderer) {
  if (_modelCache.has(url)) {
    // Upgrade the singleton KTX2 loader if this cached call is the first one that
    // knows about the renderer.
    gltfLoader(renderer);
    return _modelCache.get(url);
  }
  const p = new Promise((resolve) => {
    gltfLoader(renderer).load(
      url,
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
  _modelCache.set(url, p);
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
  return new Promise((resolve) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader(manager).load(
      url,
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
