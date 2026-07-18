// ───────────────────────────────────────────────────────────────────────────
// assets.js — tracked glTF pipeline, asset-library lookup, and runtime resolver.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { loadingManager, trackLoadingFetch, trackLoadingPromise } from './loader.js';
import { assetRuntimeRegistry } from './runtime/AssetRuntimeRegistry.js';

const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/';

let gltf = null;
let ktx2 = null;
let ktxRenderer = null;
function gltfLoader(renderer) {
  if (!gltf) {
    const draco = new DRACOLoader(loadingManager).setDecoderPath(CDN + 'draco/');
    ktx2 = new KTX2Loader(loadingManager).setTranscoderPath(CDN + 'basis/');
    gltf = new GLTFLoader(loadingManager)
      .setDRACOLoader(draco)
      .setKTX2Loader(ktx2)
      .setMeshoptDecoder(MeshoptDecoder);
  }
  if (renderer && ktx2 && ktxRenderer !== renderer) {
    try {
      ktx2.detectSupport(renderer);
      ktxRenderer = renderer;
    } catch (error) {
      console.warn('[assets] KTX2 renderer detection failed; normal textures still work', error);
    }
  }
  return gltf;
}

const modelCache = new Map();
const modelFailures = new Map();
let successfulModels = 0;

// The production indexes begin warming as soon as the asset module is imported.
// The real loading gate tracks this promise, so gameplay cannot reveal while the
// resolver is still learning which generated assets exist.
export const assetRegistryReady = assetRuntimeRegistry.load();

export async function loadModel(url, renderer) {
  if (!url) return null;
  if (modelCache.has(url)) {
    gltfLoader(renderer);
    return modelCache.get(url);
  }
  const task = new Promise((resolve) => {
    gltfLoader(renderer).load(
      url,
      (loaded) => {
        loaded.scene.traverse((object) => {
          if (!object.isMesh) return;
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) if (material) material.envMapIntensity = 1.0;
        });
        successfulModels += 1;
        modelFailures.delete(url);
        resolve({ scene: loaded.scene, animations: loaded.animations || [] });
      },
      undefined,
      (error) => {
        modelFailures.set(url, error?.message || 'load/decode error');
        resolve(null);
      },
    );
  });
  modelCache.set(url, task);
  return task;
}

export function assetCacheSnapshot() {
  return Object.freeze({
    modelRequests: modelCache.size,
    successfulModels,
    failedModels: Object.fromEntries(modelFailures),
    assetRegistry: assetRuntimeRegistry.snapshot(),
  });
}

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
      let action = this.actions[name];
      if (!action) { action = mixer.clipAction(clip); this.actions[name] = action; }
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.reset().fadeIn(fade).play();
      return action;
    },
    stop(name, fade = 0.2) { this.actions[name]?.fadeOut(fade); },
    update(dt) { mixer.update(dt); },
    dispose() {
      mixer.stopAllAction();
      for (const action of Object.values(this.actions)) action.stop();
      this.actions = {};
    },
  };
}

export async function loadHDRI(renderer, url, manager = loadingManager) {
  return new Promise((resolve) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader(manager).load(
      url,
      (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const env = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        pmrem.dispose();
        resolve(env);
      },
      undefined,
      () => { pmrem.dispose(); resolve(null); },
    );
  });
}

export async function loadManifest(url = './assets/manifest.json') {
  try {
    const response = await trackLoadingFetch(url, undefined, 'Reading asset manifest…');
    return await response.json();
  } catch { return {}; }
}

let kitsIndex = null;
export async function loadKitsIndex(url = './assets/models/kits-index.json') {
  if (kitsIndex) return kitsIndex;
  try {
    const response = await trackLoadingFetch(url, undefined, 'Indexing city kits…');
    kitsIndex = await response.json();
  } catch { kitsIndex = { kits: {} }; }
  return kitsIndex;
}

export async function loadKitModel(kitId, name, renderer) {
  const index = await loadKitsIndex();
  const kit = index.kits?.[kitId];
  if (!kit) return null;
  const entry = kit.models.find((model) => model.name === name);
  if (!entry) return null;
  return loadModel('./' + entry.url, renderer);
}

let assetLibrary = null;
export async function loadAssetLibrary(url = './assets/models/asset-index-v2.json') {
  if (assetLibrary) return assetLibrary;
  try {
    const response = await trackLoadingFetch(url, undefined, 'Indexing organized assets…');
    assetLibrary = await response.json();
  } catch { assetLibrary = {}; }
  return assetLibrary;
}

export async function listAssets(category, pack) {
  const library = await loadAssetLibrary();
  const categoryEntries = library[category] || {};
  if (pack) return categoryEntries[pack] || [];
  return Object.values(categoryEntries).flat();
}

export async function findAsset(category, pack, nameLike) {
  const list = await listAssets(category, pack);
  if (!nameLike) return list[0] || null;
  const query = String(nameLike).toLowerCase();
  return list.find((entry) => String(entry.name).toLowerCase() === query)
    || list.find((entry) => String(entry.name).toLowerCase().includes(query))
    || null;
}

export async function loadAsset(category, pack, nameLike, renderer) {
  const entry = await findAsset(category, pack, nameLike);
  if (!entry) return null;
  return loadModel('./assets/' + entry.path, renderer);
}

export async function resolveAssetById(id, options = {}) {
  await assetRegistryReady;
  return assetRuntimeRegistry.resolve(id, options);
}

export async function loadRegisteredAsset(id, renderer, options = {}) {
  const record = await resolveAssetById(id, options);
  if (!record || record.placeholder || record.kind !== 'model') return null;
  try {
    const loaded = await loadModel(record.path, renderer);
    if (!loaded) assetRuntimeRegistry.markFailure(id, 'model load returned no scene');
    return loaded ? { ...loaded, record } : null;
  } catch (error) {
    assetRuntimeRegistry.markFailure(id, error);
    return null;
  }
}

export async function preloadRegisteredAssets(criteria, renderer, options = {}) {
  await assetRegistryReady;
  const records = assetRuntimeRegistry.preloadList({ ...criteria, limit: options.limit || 16 });
  const concurrency = Math.max(1, Math.min(4, options.concurrency || 2));
  let cursor = 0;
  const results = [];
  const worker = async () => {
    while (cursor < records.length) {
      const record = records[cursor++];
      const loaded = await loadRegisteredAsset(record.id, renderer);
      results.push({ id: record.id, loaded: !!loaded });
    }
  };
  await trackLoadingPromise(
    Promise.all(Array.from({ length: Math.min(concurrency, records.length || 1) }, worker)),
    options.label || 'Preloading nearby assets…',
  );
  return results;
}

if (typeof window !== 'undefined') {
  window.__ZW_ASSET_CACHE_REPORT__ = assetCacheSnapshot;
}
